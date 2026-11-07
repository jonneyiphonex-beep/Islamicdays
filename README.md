# Islamicdays

A lightweight Islamic calendar app that pulls data from the Al Adhan API and displays a Gregorian-to-Hijri monthly calendar in the browser.

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## Deploy to GitHub Pages

The GitHub Actions workflow publishes the `public` directory to GitHub Pages whenever changes are pushed to `main`. Enable **GitHub Actions** as the Pages build and deployment source in the repository's Pages settings. The site is then available at https://jonneyiphonex-beep.github.io/Islamicdays/. The static site calls the Al Adhan API directly from the browser and does not require the Express server.

## Features

- Select any Gregorian month and year
- View matching Hijri dates for the month
- See the weekday and month names returned by the API
- Highlight the Islamic white days (13th, 14th, and 15th of the month) for quick recognition
- Show the last third of the night as a prayer and worship window, aligned to the time of divine descent in the final portion of the night
- Detect the user's current location automatically (with browser geolocation) and open the selected spot in OpenStreetMap for quick map confirmation
- Uses the public Al Adhan calendar and prayer-timing endpoints: `https://api.aladhan.com/v1/gToHCalendar/{month}/{year}`, `https://api.aladhan.com/v1/timingsByCity/{date}`, and coordinate-based prayer timings
