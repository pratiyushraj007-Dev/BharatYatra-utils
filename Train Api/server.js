const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const stationApi = require('./station.js');
app.use('/api', stationApi.router);

// ─── Static + Start ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

process.on('SIGINT', async () => { if (browser) await browser.close(); process.exit(0); });

app.listen(PORT, () => console.log(`\n🚂 RailScanner running → http://localhost:${PORT}\n`));
