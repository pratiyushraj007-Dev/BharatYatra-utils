const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://www.confirmtkt.com/', { waitUntil: 'networkidle2' });
  
  const jsData = await page.evaluate(() => {
    // See if any global variable holds a large array
    const largeArrays = [];
    for (let key in window) {
      if (Array.isArray(window[key]) && window[key].length > 1000) {
        largeArrays.push({ key, length: window[key].length });
      } else if (window[key] && typeof window[key] === 'object') {
        const keys = Object.keys(window[key]);
        if (keys.length > 1000) {
          largeArrays.push({ key, length: keys.length });
        }
      }
    }
    
    // Also grab all script source URLs
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    
    return { largeArrays, scripts };
  });

  console.log(JSON.stringify(jsData, null, 2));

  await browser.close();
})();
