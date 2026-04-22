const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.confirmtkt.com/rbooking/trains/from/RPAR/to/DDN/09-04-2026', { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 10000));
  
  const data = await page.evaluate(() => {
    let nextData = document.getElementById('__NEXT_DATA__');
    return nextData ? nextData.innerText.substring(0, 1000) : "No next data";
  });
  
  console.log(data);
  await browser.close();
})();
