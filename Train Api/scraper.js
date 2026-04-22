const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your personal HTML/JS can call this API
app.use(cors());
app.use(express.json());

const stationApi = require('./station.js');
app.use('/api', stationApi.router);

// Cleanup Puppeteer on exit
process.on('SIGINT', async () => { 
  await stationApi.closeBrowser();
  process.exit(0); 
});

app.listen(PORT, () => {
  console.log(`\n✅ Train Scraper API running on http://localhost:${PORT}`);
  console.log(`Test Stations API: http://localhost:${PORT}/api/stations?q=Delhi`);
  console.log(`Test Trains API:   http://localhost:${PORT}/api/trains?from=NDLS&to=MMCT&date=09-04-2026\n`);
});
