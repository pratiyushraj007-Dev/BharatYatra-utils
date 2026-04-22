const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let STATIONS_LIST = [];
try {
  // Try to load stations.json from the current directory
  const fileData = fs.readFileSync(path.join(__dirname, 'stations.json'), 'utf8');
  const geojson = JSON.parse(fileData);
  if (geojson && geojson.features) {
    STATIONS_LIST = geojson.features.map(f => ({
      name: f.properties.name,
      code: f.properties.code
    })).filter(s => s.name && s.code);
  }
} catch (e) {
  console.log("Error loading stations.json:", e.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Puppeteer browser instance (reused across requests)
// ═══════════════════════════════════════════════════════════════════════════════
let browser = null;

async function getBrowser() {
  if (!browser || !browser.connected) {
    console.log('[BROWSER] Launching headless Chrome...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-gpu', 
        '--window-size=1280,900'
      ],
    });
    console.log('[BROWSER] Chrome ready.');
  }
  return browser;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Scraping Function (Exported for direct use if needed)
// ═══════════════════════════════════════════════════════════════════════════════
async function scrapeTrains(fromCode, toCode, dateStr) {
  const url = `https://www.confirmtkt.com/rbooking/trains/from/${fromCode}/to/${toCode}/${dateStr}`;
  console.log(`[SCRAPE] ${url}`);

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setRequestInterception(true);
    page.on('request', r => {
      if (['image', 'font', 'media'].includes(r.resourceType())) r.abort();
      else r.continue();
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForFunction(
        () => {
          const text = document.body.innerText || '';
          return text.includes('Schedule') || 
                 text.includes('No trains') ||
                 text.includes('Nearby') ||
                 text.includes('Trains found');
        },
        { timeout: 20000 }
      );
    } catch { console.log('[SCRAPE] Timed out waiting for content, attempting parse...'); }

    await new Promise(r => setTimeout(r, 4000));

    const data = await page.evaluate((reqFrom, reqTo, reqDate) => {
      let trains = [];
      let nearbyTrains = [];
      let text = document.body.innerText || '';

      const trainBlocks = [];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let currentTrain = null;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        const trainStartMatch = line.match(/^(\d{4,5})\s*(.+)(?:Express|Exp|Mail|Sf|Passenger|Superfast)?(\s*[\d\.]+)?$/i);
        
        if (trainStartMatch && !line.includes('trains found') && !line.includes('Running')) {
          if (currentTrain) trainBlocks.push(currentTrain);
          
          const num = trainStartMatch[1];
          const namePart = trainStartMatch[2];
          
          currentTrain = {
            number: num,
            name: `${num} ${namePart}`.trim(),
            lines: [],
            isNearby: false,
          };
          
          if ((i > 0 && lines[i-1].includes('Nearby Station')) || 
              (i > 1 && lines[i-2].includes('Nearby Station'))) {
            currentTrain.isNearby = true;
          }
        } else if (currentTrain) {
          currentTrain.lines.push(line);
        }
      }
      if (currentTrain) trainBlocks.push(currentTrain);

      trainBlocks.forEach(tb => {
        let departure = '', arrival = '', src = '', dst = '', duration = '';
        let nearbyFromDist = '', nearbyToDist = '';
        const classesMap = {};

        const fullBlockText = tb.lines.join(' ');
        
        let timeStns = [];
        let tsM;
        const localTsRe = new RegExp(/(\d{2}:\d{2})\s+([A-Z]{2,6})/g);
        while ((tsM = localTsRe.exec(fullBlockText)) !== null) {
          timeStns.push({ time: tsM[1], stn: tsM[2] });
        }
        
        if (timeStns.length >= 2) {
          departure = timeStns[0].time; src = timeStns[0].stn;
          arrival = timeStns[1].time; dst = timeStns[1].stn;
        } else if (timeStns.length === 1) {
          departure = timeStns[0].time; src = timeStns[0].stn;
        }

        const durM = fullBlockText.match(/(\d+)h\s+(\d+)m/);
        if (durM) duration = `${durM[1]}h ${durM[2]}m`;

        const distRe = new RegExp(`(\\d+)\\s*km\\s+from\\s+([A-Z]{2,6})`, 'gi');
        let distM;
        while ((distM = distRe.exec(fullBlockText)) !== null) {
          if (distM[2].toUpperCase() === reqFrom) nearbyFromDist = distM[1] + 'km';
          else if (distM[2].toUpperCase() === reqTo) nearbyToDist = distM[1] + 'km';
        }

        for (let i = 0; i < tb.lines.length; i++) {
           const l = tb.lines[i];
           const classMatch = l.match(/^(1A|2A|3A|3E|SL|CC|2S)(\s*Tatkal)?(\s*₹.*)?/i);
           if (classMatch) {
              const clsName = classMatch[1] + (classMatch[2] ? ' (Tatkal)' : '');
              const context = tb.lines.slice(i, i+3).join(' '); 
              
              const priceMatch = context.match(/₹\s*([0-9,]+)/);
              const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
              
              let status = 'Check', avail = 'Check availability', prediction = '';
              
              if (/Not\s*Available|regret|Train\s*Departed/i.test(context)) {
                status = 'Regret'; avail = 'Not Available';
              } else if (/RAC\s*(\d+)/i.test(context)) {
                status = 'RAC';
                const m = context.match(/RAC\s*(\d+)/i);
                avail = m ? `RAC ${m[1]}` : 'RAC';
                const pm = context.match(/(\d+)%/); if (pm) prediction = `${pm[1]}%`;
              } else if (/WL\s*(\d+)/i.test(context)) {
                status = 'WL';
                const m = context.match(/WL\s*(\d+)/i);
                avail = m ? `WL ${m[1]}` : 'WL';
                const pm = context.match(/(\d+)%/); if (pm) prediction = `${pm[1]}%`;
              } else if (/CURR_AVL\s*(\d+)/i.test(context)) {
                status = 'Available';
                const m = context.match(/CURR_AVL\s*(\d+)/i); avail = `${m[1]} seats`;
              } else if (/AVL\s*(\d+)/i.test(context)) {
                status = 'Available';
                const m = context.match(/AVL\s*(\d+)/i); avail = `${m[1]} seats`;
              } else if (/Available/i.test(context)) {
                 status = 'Available'; avail = 'Available';
              }
              
              classesMap[clsName] = {
                 cls: clsName, price, status, avail, prediction, date: reqDate,
                 link: `https://www.confirmtkt.com/rbooking/trains/from/${src || reqFrom}/to/${dst || reqTo}/${reqDate}`
              };
           }
        }
        
        const finalTrain = {
          number: tb.number,
          name: tb.name,
          departure, arrival, duration,
          src: src || reqFrom, dst: dst || reqTo,
          classes: Object.values(classesMap),
          isNearby: tb.isNearby,
          nearbyFromDist, nearbyToDist,
          nearbyFromStn: tb.isNearby && src && src !== reqFrom ? src : '',
          nearbyToStn: tb.isNearby && dst && dst !== reqTo ? dst : ''
        };
        
        if (tb.isNearby) nearbyTrains.push(finalTrain);
        else trains.push(finalTrain);
      });

      const noTrainsMatch = /0\s+Trains?\s+found|No trains found|No trains found for this route/i.test(text);

      return {
        trains,
        nearbyTrains,
        noDirectTrains: noTrainsMatch && trains.length === 0,
        total: trains.length,
        dateStr: reqDate
      };
    }, fromCode, toCode, dateStr);

    console.log(`[SCRAPE] Extracted ${data.trains.length} direct + ${data.nearbyTrains.length} nearby trains`);
    return data;
  } finally {
    await page.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Express Router
// ═══════════════════════════════════════════════════════════════════════════════
const router = express.Router();

/**
 * GET /stations?q=<query>
 * Station Autocomplete
 */
router.get('/stations', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (q.length < 1) return res.json([]);
  
  const results = STATIONS_LIST
    .filter(info =>
      info.name.toLowerCase().includes(q) || info.code.toLowerCase().includes(q)
    )
    .slice(0, 12);
    
  res.json(results);
});

/**
 * GET /trains?from=<name_or_code>&to=<name_or_code>&date=<DD-MM-YYYY>
 * Train Scraping Endpoint
 */
router.get('/trains', async (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Both from and to are required.' });

  const matchFrom = STATIONS_LIST.find(s => s.name.toLowerCase() === from.toLowerCase() || s.code.toUpperCase() === from.toUpperCase());
  const matchTo = STATIONS_LIST.find(s => s.name.toLowerCase() === to.toLowerCase() || s.code.toUpperCase() === to.toUpperCase());

  if (!matchFrom) return res.status(400).json({ error: `Unknown origin station: "${from}".` });
  if (!matchTo) return res.status(400).json({ error: `Unknown destination station: "${to}".` });

  const fromCode = matchFrom.code;
  const toCode = matchTo.code;

  let dateStr = date;
  if (!dateStr) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    dateStr = `${dd}-${mm}-${yyyy}`;
  }

  console.log(`[API Router] Fetching: ${matchFrom.name} (${fromCode}) → ${matchTo.name} (${toCode}) on ${dateStr}`);
  
  try {
    const data = await scrapeTrains(fromCode, toCode, dateStr);

    const nearbyStationSuggestions = [];
    const seenCodes = new Set([fromCode, toCode]);
    
    if (data.nearbyTrains) {
      data.nearbyTrains.forEach(t => {
        if (t.nearbyFromStn && !seenCodes.has(t.nearbyFromStn)) {
          seenCodes.add(t.nearbyFromStn);
          const match = STATIONS_LIST.find(info => info.code === t.nearbyFromStn);
          nearbyStationSuggestions.push({ name: match ? match.name : t.nearbyFromStn, code: t.nearbyFromStn, distance: t.nearbyFromDist, type: 'origin' });
        }
        if (t.nearbyToStn && !seenCodes.has(t.nearbyToStn)) {
          seenCodes.add(t.nearbyToStn);
          const match = STATIONS_LIST.find(info => info.code === t.nearbyToStn);
          nearbyStationSuggestions.push({ name: match ? match.name : t.nearbyToStn, code: t.nearbyToStn, distance: t.nearbyToDist, type: 'destination' });
        }
      });
    }

    if (!data.trains.length && !data.nearbyTrains.length) {
      return res.status(404).json({ 
        error: `No trains found between ${from} and ${to} on ${dateStr}.`,
        suggestion: 'Try a different date or check nearby stations.',
        noDirectTrains: data.noDirectTrains
      });
    }

    res.json({ 
      success: true, 
      from: matchFrom.name, 
      to: matchTo.name, 
      date: dateStr,
      ...data, 
      nearbyStationSuggestions 
    });

  } catch (err) {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Scraping failed.', details: err.message });
  }
});

// Clean up browser instance on exit
process.on('SIGINT', async () => { 
  if (browser) await browser.close(); 
  process.exit(0); 
});

module.exports = {
  router,
  scrapeTrains,
  STATIONS_LIST,
  getBrowser,
  
  // A helper function to close the global browser instance if needed
  closeBrowser: async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  }
};
