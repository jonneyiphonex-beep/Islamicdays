const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

function parseTimingMinutes(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function normalizeClock(totalMinutes) {
  const normalized = Math.round(((totalMinutes % 1440) + 1440) % 1440);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateLastThirdWindow(timings) {
  const fajr = parseTimingMinutes(timings?.Fajr);
  const lastThirdStart = parseTimingMinutes(timings?.Lastthird);

  if (fajr !== null && lastThirdStart !== null) {
    return {
      start: normalizeClock(lastThirdStart),
      end: normalizeClock(fajr),
      title: 'ثلث الليل الأخير',
      description: 'وقت التنزل الإلهي في آخر الثلث من الليل، مناسب للعبادة والصلاة.'
    };
  }

  const maghrib = parseTimingMinutes(timings?.Maghrib);
  if (fajr === null || maghrib === null) {
    return null;
  }

  const nightDuration = (fajr + (1440 - maghrib)) % 1440;
  const fallbackStart = (maghrib + Math.round((nightDuration * 2) / 3)) % 1440;

  return {
    start: normalizeClock(fallbackStart),
    end: normalizeClock(fajr),
    title: 'ثلث الليل الأخير',
    description: 'وقت التنزل الإلهي في آخر الثلث من الليل، مناسب للعبادة والصلاة.'
  };
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/calendar', async (req, res) => {
  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  const year = Number(req.query.year ?? new Date().getFullYear());

  if (!Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
    return res.status(400).json({
      error: 'month must be a valid number from 1 to 12 and year must be numeric.'
    });
  }

  try {
    const response = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}`);

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const payload = await response.json();

    return res.json({
      month,
      year,
      data: payload.data || []
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Unable to fetch Islamic calendar data from the Al Adhan API.',
      details: error.message
    });
  }
});

app.get('/api/night-window', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const city = req.query.city || '';
  const country = req.query.country || '';
  const hasCoordinates = req.query.latitude !== undefined && req.query.longitude !== undefined;
  const latitude = hasCoordinates ? Number(req.query.latitude) : null;
  const longitude = hasCoordinates ? Number(req.query.longitude) : null;

  if (hasCoordinates &&
      (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
       latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }

  if (!hasCoordinates && (!city || !country)) {
    return res.status(400).json({
      error: 'Location is required. Allow location access or provide both city and country.'
    });
  }

  const apiDate = date.includes('-') ? date.split('-').reverse().join('-') : date;

  try {
    let payload;
    let locationName = [city, country].filter(Boolean).join(', ').trim();
    let response;

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const url = new URL(`https://api.aladhan.com/v1/timings/${apiDate}`);
      url.searchParams.set('latitude', String(latitude));
      url.searchParams.set('longitude', String(longitude));
      url.searchParams.set('method', '5');
      response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Upstream returned ${response.status}`);
      }

      payload = await response.json();
      if (payload.code !== 200 || !payload.data?.timings) {
        throw new Error(payload.status || 'Al Adhan returned no prayer timing data.');
      }
      locationName = [city, country].filter(Boolean).join(', ').trim() || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } else {
      const url = new URL(`https://api.aladhan.com/v1/timingsByCity/${apiDate}`);
      url.searchParams.set('city', city);
      url.searchParams.set('country', country);
      url.searchParams.set('method', '5');
      response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Upstream returned ${response.status}`);
      }

      payload = await response.json();
      if (payload.code !== 200 || !payload.data?.timings) {
        throw new Error(payload.status || 'Al Adhan returned no prayer timing data.');
      }
    }

    const timings = payload.data?.timings || {};
    const lastThird = calculateLastThirdWindow(timings);

    return res.json({
      city,
      country,
      latitude: hasCoordinates ? latitude : Number(payload.data?.meta?.latitude || 0),
      longitude: hasCoordinates ? longitude : Number(payload.data?.meta?.longitude || 0),
      date,
      locationName,
      timings,
      lastThird
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Unable to fetch prayer timing data from the Al Adhan API.',
      details: error.message
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Islamicdays app running at http://localhost:${PORT}`);
});
