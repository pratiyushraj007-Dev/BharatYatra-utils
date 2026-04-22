const puppeteer = require("puppeteer");

// ============================================================
//  1. STATIC CITIES DATA
// ============================================================
const CITIES = {
  "Hyderabad":        { id: 3,    state: "Telangana" },
  "Mumbai":           { id: 4,    state: "Maharashtra" },
  "Bangalore":        { id: 7,    state: "Karnataka" },
  "Bengaluru":        { id: 7,    state: "Karnataka" },
  "Chennai":          { id: 5,    state: "Tamil Nadu" },
  "Delhi":            { id: 68,   state: "Delhi" },
  "New Delhi":        { id: 68,   state: "Delhi" },
  "Pune":             { id: 90,   state: "Maharashtra" },
  "Kolkata":          { id: 71,   state: "West Bengal" },
  "Ahmedabad":        { id: 61,   state: "Gujarat" },
  "Jaipur":           { id: 66,   state: "Rajasthan" },
  "Lucknow":          { id: 73,   state: "Uttar Pradesh" },
  "Goa":              { id: 18,   state: "Goa" },
  "Panaji":           { id: 18,   state: "Goa" },
  "Visakhapatnam":    { id: 1,    state: "Andhra Pradesh" },
  "Vizag":            { id: 1,    state: "Andhra Pradesh" },
  "Vijayawada":       { id: 2,    state: "Andhra Pradesh" },
  "Tirupati":         { id: 10,   state: "Andhra Pradesh" },
  "Coimbatore":       { id: 33,   state: "Tamil Nadu" },
  "Madurai":          { id: 38,   state: "Tamil Nadu" },
  "Mysore":           { id: 25,   state: "Karnataka" },
  "Mysuru":           { id: 25,   state: "Karnataka" },
  "Mangalore":        { id: 27,   state: "Karnataka" },
  "Mangaluru":        { id: 27,   state: "Karnataka" },
  "Hubli":            { id: 22,   state: "Karnataka" },
  "Dharwad":          { id: 23,   state: "Karnataka" },
  "Belgaum":          { id: 24,   state: "Karnataka" },
  "Belagavi":         { id: 24,   state: "Karnataka" },
  "Gulbarga":         { id: 26,   state: "Karnataka" },
  "Kalaburagi":       { id: 26,   state: "Karnataka" },
  "Shimoga":          { id: 28,   state: "Karnataka" },
  "Shivamogga":       { id: 28,   state: "Karnataka" },
  "Davangere":        { id: 29,   state: "Karnataka" },
  "Bellary":          { id: 30,   state: "Karnataka" },
  "Ballari":          { id: 30,   state: "Karnataka" },
  "Bijapur":          { id: 31,   state: "Karnataka" },
  "Vijayapura":       { id: 31,   state: "Karnataka" },
  "Raichur":          { id: 32,   state: "Karnataka" },
  "Nellore":          { id: 11,   state: "Andhra Pradesh" },
  "Guntur":           { id: 12,   state: "Andhra Pradesh" },
  "Kakinada":         { id: 6,    state: "Andhra Pradesh" },
  "Rajahmundry":      { id: 8,    state: "Andhra Pradesh" },
  "Kurnool":          { id: 9,    state: "Andhra Pradesh" },
  "Anantapur":        { id: 13,   state: "Andhra Pradesh" },
  "Kadapa":           { id: 14,   state: "Andhra Pradesh" },
  "Ongole":           { id: 15,   state: "Andhra Pradesh" },
  "Eluru":            { id: 16,   state: "Andhra Pradesh" },
  "Srikakulam":       { id: 17,   state: "Andhra Pradesh" },
  "Warangal":         { id: 19,   state: "Telangana" },
  "Karimnagar":       { id: 20,   state: "Telangana" },
  "Nizamabad":        { id: 21,   state: "Telangana" },
  "Nagpur":           { id: 91,   state: "Maharashtra" },
  "Nashik":           { id: 92,   state: "Maharashtra" },
  "Aurangabad":       { id: 93,   state: "Maharashtra" },
  "Solapur":          { id: 94,   state: "Maharashtra" },
  "Kolhapur":         { id: 95,   state: "Maharashtra" },
  "Indore":           { id: 74,   state: "Madhya Pradesh" },
  "Bhopal":           { id: 75,   state: "Madhya Pradesh" },
  "Chandigarh":       { id: 69,   state: "Chandigarh" },
  "Amritsar":         { id: 76,   state: "Punjab" },
  "Thiruvananthapuram":{ id: 40,  state: "Kerala" },
  "Trivandrum":       { id: 40,   state: "Kerala" },
  "Kochi":            { id: 41,   state: "Kerala" },
  "Cochin":           { id: 41,   state: "Kerala" },
  "Kozhikode":        { id: 42,   state: "Kerala" },
  "Calicut":          { id: 42,   state: "Kerala" },
  "Thrissur":         { id: 43,   state: "Kerala" },
  "Salem":            { id: 34,   state: "Tamil Nadu" },
  "Trichy":           { id: 35,   state: "Tamil Nadu" },
  "Tiruchirappalli":  { id: 35,   state: "Tamil Nadu" },
  "Tirunelveli":      { id: 36,   state: "Tamil Nadu" },
  "Vellore":          { id: 37,   state: "Tamil Nadu" },
  "Pondicherry":      { id: 39,   state: "Tamil Nadu" },
  "Puducherry":       { id: 39,   state: "Tamil Nadu" },
  "Surat":            { id: 62,   state: "Gujarat" },
  "Vadodara":         { id: 63,   state: "Gujarat" },
  "Rajkot":           { id: 64,   state: "Gujarat" },
  "Bhavnagar":        { id: 65,   state: "Gujarat" },
  "Udaipur":          { id: 67,   state: "Rajasthan" },
  "Jodhpur":          { id: 77,   state: "Rajasthan" },
  "Patna":            { id: 70,   state: "Bihar" },
  "Ranchi":           { id: 72,   state: "Jharkhand" },
  "Bhubaneswar":      { id: 78,   state: "Odisha" },
  "Cuttack":          { id: 79,   state: "Odisha" },
  "Guwahati":         { id: 80,   state: "Assam" },
  "Varanasi":         { id: 81,   state: "Uttar Pradesh" },
  "Agra":             { id: 82,   state: "Uttar Pradesh" },
  "Kanpur":           { id: 83,   state: "Uttar Pradesh" },
  "Dehradun":         { id: 84,   state: "Uttarakhand" },
  "Haridwar":         { id: 85,   state: "Uttarakhand" },
  "Rishikesh":        { id: 86,   state: "Uttarakhand" },
  "Manali":           { id: 87,   state: "Himachal Pradesh" },
  "Shimla":           { id: 88,   state: "Himachal Pradesh" },
  "Jammu":            { id: 89,   state: "Jammu & Kashmir" },
  "Raipur":           { id: 96,   state: "Chhattisgarh" },
  "Shirdi":           { id: 97,   state: "Maharashtra" },
  "Nanded":           { id: 98,   state: "Maharashtra" },
  "Latur":            { id: 99,   state: "Maharashtra" },
  "Sangli":           { id: 100,  state: "Maharashtra" },
  "Satara":           { id: 101,  state: "Maharashtra" },
};


// ============================================================
//  3. CITY SCRAPER LOGIC
// ============================================================
let cityScraperBrowser = null;
let sessionPage = null;
let isInitializing = false;
let initPromise = null;
let lastCapturedCities = [];

async function ensureSession() {
  if (sessionPage && !sessionPage.isClosed() && cityScraperBrowser && cityScraperBrowser.connected) {
    return sessionPage;
  }

  if (isInitializing && initPromise) return initPromise;

  isInitializing = true;
  initPromise = _initSession();
  try {
    return await initPromise;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

async function _initSession() {
  console.log("[CityScraper] Launching browser...");

  if (cityScraperBrowser && cityScraperBrowser.connected) {
    try { await cityScraperBrowser.close(); } catch {}
  }

  cityScraperBrowser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: { width: 1280, height: 900 },
  });

  sessionPage = await cityScraperBrowser.newPage();

  await sessionPage.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  );

  sessionPage.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("get_city_list") ||
      url.includes("city_list") ||
      url.includes("city/suggest") ||
      url.includes("search/cities") ||
      url.includes("autocomplete")
    ) {
      try {
        const text = await response.text();
        if (text && text.length > 5) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            lastCapturedCities = parsed.map((item) => ({
              name: (item.cityname || item.city_name || item.name || item.label || item.value || "").trim(),
              id: parseInt(item.id || item.city_id || item.cityId || "0", 10) || null,
              state: (item.statename || item.state_name || item.state || "").trim(),
            })).filter((c) => c.name);

            console.log(`[CityScraper] 📡 Captured ${lastCapturedCities.length} cities from network`);
            if (lastCapturedCities.length > 0) {
              console.log(`[CityScraper]    First: ${lastCapturedCities[0].name} (ID: ${lastCapturedCities[0].id})`);
            }
          }
        }
      } catch {}
    }
  });

  await sessionPage.goto("https://www.abhibus.com", {
    waitUntil: "networkidle2",
    timeout: 45000,
  });

  await new Promise((r) => setTimeout(r, 3000));
  console.log("[CityScraper] Session ready ✅");

  return sessionPage;
}

let processing = false;
const queue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    if (!processing) drain();
  });
}

async function drain() {
  if (processing || queue.length === 0) return;
  processing = true;
  const { fn, resolve, reject } = queue.shift();
  try {
    resolve(await fn());
  } catch (e) {
    reject(e);
  }
  processing = false;
  drain();
}

async function _typeAndCapture(page, query) {
  lastCapturedCities = [];

  const currentUrl = page.url();
  if (!currentUrl.includes("abhibus.com") || currentUrl.includes("bus_search")) {
    await page.goto("https://www.abhibus.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  await page.click("body").catch(() => {});
  await new Promise((r) => setTimeout(r, 300));

  const inputFound = await page.evaluate(() => {
    const inputs = document.querySelectorAll("input");
    for (const input of inputs) {
      const ph = (input.placeholder || "").toLowerCase();
      const nm = (input.name || "").toLowerCase();
      const id = (input.id || "").toLowerCase();
      if (
        ph.includes("leaving") || ph.includes("source") || ph.includes("from") ||
        nm.includes("source") || id.includes("source") || id.includes("from")
      ) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value"
        ).set;
        nativeInputValueSetter.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();
        input.click();
        return true;
      }
    }
    return false;
  });

  if (!inputFound) {
    console.log("[CityScraper] ⚠️ Source input not found, reloading...");
    await page.goto("https://www.abhibus.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));
    return [];
  }

  await page.keyboard.type(query, { delay: 10 }); // massively speed up typing

  let pollAttempts = 0;
  while (lastCapturedCities.length === 0 && pollAttempts < 15) {
    await new Promise((r) => setTimeout(r, 150));
    pollAttempts++;
  }

  if (lastCapturedCities.length > 0) {
    console.log(`[CityScraper] ✅ Network capture: ${lastCapturedCities.length} cities for "${query}"`);
    const result = [...lastCapturedCities];

    await _clearInput(page);
    return result;
  }

  console.log(`[CityScraper] No network capture, reading DOM for "${query}"...`);

  const domCities = await page.evaluate(() => {
    const results = [];
    const seen = new Set();

    const allElements = document.querySelectorAll(
      "ul li, [class*='auto'] li, [class*='suggest'] li, [class*='Auto'] li, " +
      "[class*='Suggest'] li, [class*='dropdown'] li, [class*='Drop'] li, " +
      "[role='option'], [role='listbox'] > *, [class*='city'] li, [class*='City'] li, " +
      "[class*='list'] li, [class*='List'] li, [class*='result'] li"
    );

    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.height < 10 || rect.width < 50 || rect.top < 0 || rect.top > 800) continue;

      const text = (el.innerText || el.textContent || "").trim();
      if (!text || text.length < 2 || text.length > 100 || seen.has(text)) continue;
      seen.add(text);

      let id = null;
      const checkAttrs = (element) => {
        if (!element) return null;
        for (const attr of element.attributes || []) {
          const name = attr.name.toLowerCase();
          const val = attr.value;
          if ((name.includes("id") || name.includes("value") || name.includes("key")) &&
              /^\d{2,}$/.test(val)) {
            return parseInt(val, 10);
          }
        }
        return null;
      };

      id = checkAttrs(el) || checkAttrs(el.parentElement) || checkAttrs(el.querySelector("[data-id]"));

      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);
      const parts = (lines[0] || text).split(",").map((s) => s.trim());

      results.push({
        name: parts[0],
        id: id,
        state: parts.slice(1).join(", ") || lines.slice(1).join(", ") || "",
      });
    }

    return results;
  });

  await _clearInput(page);

  console.log(`[CityScraper] DOM: ${domCities.length} cities for "${query}"`);
  return domCities;
}

async function _clearInput(page) {
  try {
    await page.evaluate(() => {
      const inputs = document.querySelectorAll("input");
      for (const input of inputs) {
        const ph = (input.placeholder || "").toLowerCase();
        if (ph.includes("leaving") || ph.includes("source") || ph.includes("from")) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, "value"
          ).set;
          setter.call(input, "");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          break;
        }
      }
    });
    await page.click("body").catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
  } catch {}
}

async function scrapeCitySuggestions(query) {
  return enqueue(async () => {
    const page = await ensureSession();
    return await _typeAndCapture(page, query);
  });
}

async function getCityId(cityName) {
  const cities = await scrapeCitySuggestions(cityName);

  const exact = cities.find(
    (c) => c.name.toLowerCase() === cityName.toLowerCase() && c.id
  );
  if (exact) {
    console.log(`[CityScraper] ✅ "${cityName}" → ID ${exact.id}`);
    return exact;
  }

  const partial = cities.find(
    (c) => c.name.toLowerCase().includes(cityName.toLowerCase()) && c.id
  );
  if (partial) {
    console.log(`[CityScraper] ✅ "${cityName}" ≈ "${partial.name}" → ID ${partial.id}`);
    return partial;
  }

  const any = cities.find((c) => c.id);
  if (any) {
    console.log(`[CityScraper] ⚠️ "${cityName}" → best: ${any.name} ID ${any.id}`);
    return any;
  }

  console.log(`[CityScraper] ❌ Could not resolve "${cityName}"`);
  return null;
}

async function closeBrowser() {
  if (sessionPage && !sessionPage.isClosed()) {
    await sessionPage.close().catch(() => {});
    sessionPage = null;
  }
  if (cityScraperBrowser) {
    await cityScraperBrowser.close().catch(() => {});
    cityScraperBrowser = null;
  }
}


// ============================================================
//  4. BUS SCRAPER LOGIC
// ============================================================
function buildSearchURL(fromName, fromId, toName, toId, date) {
  const formatName = (name) =>
    encodeURIComponent(name.charAt(0).toUpperCase() + name.slice(1));
  return `https://www.abhibus.com/bus_search/${formatName(fromName)}/${fromId}/${formatName(toName)}/${toId}/${date}/O`;
}

async function scrapeBuses({ fromName, fromId, toName, toId, date }) {
  const url = buildSearchURL(fromName, fromId, toName, toId, date);
  console.log(`[Scraper] Navigating to: ${url}`);

  let busScraperBrowser;
  try {
    busScraperBrowser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--disable-blink-features=AutomationControlled",
      ],
      defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await busScraperBrowser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("[Scraper] Page loaded. Waiting for bus results...");

    try {
      await page.waitForFunction(
        () => {
          const body = document.body.innerText || "";
          return (
            body.includes("Seats Left") ||
            body.includes("seats left") ||
            body.includes("Select Seats") ||
            body.includes("No buses found") ||
            body.includes("Oops") ||
            body.includes("₹")
          );
        },
        { timeout: 30000 }
      );
    } catch (e) {
      console.log(
        "[Scraper] Timeout waiting for content, attempting extraction anyway..."
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));

    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 800);
        await new Promise((r) => setTimeout(r, 500));
      }
      window.scrollTo(0, 0);
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("[Scraper] Extracting bus data...");

    const buses = await page.evaluate(() => {
      const results = [];
      const body = document.body.innerText || "";

      if (
        body.includes("No buses found") ||
        body.includes("Oops! No buses") ||
        body.includes("0 Buses Found")
      ) {
        return results;
      }

      const allButtons = Array.from(document.querySelectorAll("button"));
      const selectButtons = allButtons.filter((btn) => {
        const text = btn.textContent.trim().toLowerCase();
        return (
          text.includes("select seat") ||
          text.includes("book now") ||
          text.includes("view seat")
        );
      });

      const priceElements = Array.from(
        document.querySelectorAll("*")
      ).filter(
        (el) =>
          el.children.length === 0 &&
          el.textContent &&
          /^₹\s*[\d,]+$/.test(el.textContent.trim())
      );

      const cardCandidates = new Set();

      for (const btn of selectButtons) {
        let card = btn;
        for (let i = 0; i < 12; i++) {
          card = card.parentElement;
          if (!card) break;
          if (card.offsetHeight > 100 && card.offsetWidth > 600) {
            cardCandidates.add(card);
            break;
          }
        }
      }

      for (const priceEl of priceElements) {
        let card = priceEl;
        for (let i = 0; i < 12; i++) {
          card = card.parentElement;
          if (!card) break;
          if (card.offsetHeight > 100 && card.offsetWidth > 600) {
            cardCandidates.add(card);
            break;
          }
        }
      }

      const processedTexts = new Set();

      for (const card of cardCandidates) {
        try {
          const cardText = card.innerText || "";
          if (cardText.length < 30) continue;
          const signature = cardText.substring(0, 80);
          if (processedTexts.has(signature)) continue;
          processedTexts.add(signature);

          const lines = cardText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          let price = null;

          const fromPriceMatch = cardText.match(/(?:From|Starting\s*from|Starts?\s*(?:at|from))\s*₹\s*([\d,]+)/i);
          if (fromPriceMatch) {
            price = parseInt(fromPriceMatch[1].replace(/,/g, ""));
          }

          if (!price) {
            const allPrices = [];
            const priceRegex = /₹\s*([\d,]+)/g;
            let pm;
            while ((pm = priceRegex.exec(cardText)) !== null) {
              const val = parseInt(pm[1].replace(/,/g, ""));
              const before = cardText.substring(Math.max(0, pm.index - 10), pm.index);
              if (/save\s*$/i.test(before)) continue;
              if (val > 0 && val < 50000) allPrices.push(val);
            }
            if (allPrices.length > 0) {
              price = Math.min(...allPrices);
            }
          }

          let departureTime = null;
          let arrivalTime = null;
          const timeMatches = cardText.match(/\b(\d{1,2}:\d{2})\b/g);
          if (timeMatches && timeMatches.length >= 2) {
            departureTime = timeMatches[0];
            arrivalTime = timeMatches[1];
          } else if (timeMatches && timeMatches.length === 1) {
            departureTime = timeMatches[0];
          }

          let duration = null;
          const durationMatch = cardText.match(
            /(\d+)\s*h[.\s]*(\d*)\s*m/i
          );
          if (durationMatch) {
            const h = durationMatch[1];
            const m = durationMatch[2] || "0";
            duration = `${h}h ${m}m`;
          }

          let operator = null;
          for (const line of lines.slice(0, 5)) {
            if (
              line.length > 3 &&
              line.length < 60 &&
              !line.includes("₹") &&
              !line.includes("Seats") &&
              !line.includes("Select") &&
              !line.includes("Rating") &&
              !line.includes("Boarding") &&
              !line.includes("Dropping") &&
              !line.includes("Track") &&
              !line.includes("View") &&
              !line.includes("Cancellation") &&
              !/^\d{1,2}:\d{2}$/.test(line) &&
              !/^\d+h/.test(line)
            ) {
              operator = line;
              break;
            }
          }

          let busType = null;
          const busTypePatterns = [
            /\b(A\/C\s+Sleeper|AC\s+Sleeper|Non\s*[-\s]?AC\s+Sleeper|AC\s+Seater|Non\s*[-\s]?AC\s+Seater|AC\s+Semi[\s-]?Sleeper|Volvo[^,\n]*|Mercedes[^,\n]*|Scania[^,\n]*|Multi[\s-]?Axle[^,\n]*|Bharat\s+Benz[^,\n]*)\b/i,
          ];
          for (const line of lines.slice(0, 6)) {
            for (const pattern of busTypePatterns) {
              const match = line.match(pattern);
              if (match) {
                busType = line;
                break;
              }
            }
            if (busType) break;
            if (
              (line.includes("AC") ||
                line.includes("Sleeper") ||
                line.includes("Seater") ||
                line.includes("Volvo") ||
                line.includes("Semi")) &&
              line.length < 80
            ) {
              busType = line;
              break;
            }
          }

          if (busType === operator && lines.length > 1) {
            for (const line of lines.slice(1, 6)) {
              if (
                (line.includes("AC") ||
                  line.includes("Sleeper") ||
                  line.includes("Seater")) &&
                line.length < 80
              ) {
                busType = line;
                break;
              }
            }
          }

          let rating = null;
          const ratingMatch = cardText.match(
            /(\d+\.?\d*)\s*(?:\/\s*5|★|star|rating)/i
          );
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
          } else {
            const ratingMatch2 = cardText.match(/\b([1-5]\.\d)\b/);
            if (ratingMatch2) {
              rating = parseFloat(ratingMatch2[1]);
            }
          }

          let seatsAvailable = null;
          const seatsMatch = cardText.match(/(\d+)\s*Seats?\s*(?:Left|Available)/i);
          if (seatsMatch) {
            seatsAvailable = parseInt(seatsMatch[1]);
          }

          if (price || departureTime) {
            results.push({
              operator: operator || "Unknown Operator",
              busType: busType || "N/A",
              departure: departureTime,
              arrival: arrivalTime,
              duration: duration || "N/A",
              price: price,
              priceFormatted: price
                ? `₹${price.toLocaleString("en-IN")}`
                : "N/A",
              rating: rating,
              seatsAvailable: seatsAvailable,
              seatsText: seatsAvailable
                ? `${seatsAvailable} Seats Left`
                : "Check Availability",
            });
          }
        } catch (err) {
          continue;
        }
      }

      if (results.length === 0) {
        const allLines = body
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        let i = 0;
        while (i < allLines.length) {
          const line = allLines[i];
          const timeMatch = line.match(/^(\d{1,2}:\d{2})$/);
          if (timeMatch) {
            const context = allLines.slice(Math.max(0, i - 5), i + 10);
            const contextText = context.join(" ");

            let price = null;
            const fromPm = contextText.match(/(?:From|Starting\s*from)\s*₹\s*([\d,]+)/i);
            if (fromPm) {
              price = parseInt(fromPm[1].replace(/,/g, ""));
            } else {
              const allP = [];
              const prx = /₹\s*([\d,]+)/g;
              let m;
              while ((m = prx.exec(contextText)) !== null) {
                const v = parseInt(m[1].replace(/,/g, ""));
                const bef = contextText.substring(Math.max(0, m.index - 10), m.index);
                if (/save\s*$/i.test(bef)) continue;
                if (v > 0 && v < 50000) allP.push(v);
              }
              if (allP.length > 0) price = Math.min(...allP);
            }

            let dep = timeMatch[1];
            let arr = null;
            for (let j = i + 1; j < Math.min(i + 8, allLines.length); j++) {
              const tm = allLines[j].match(/^(\d{1,2}:\d{2})$/);
              if (tm) {
                arr = tm[1];
                break;
              }
            }

            let dur = null;
            const dm = contextText.match(/(\d+)\s*h[.\s]*(\d*)\s*m/i);
            if (dm) dur = `${dm[1]}h ${dm[2] || "0"}m`;

            let op = null;
            for (const c of context) {
              if (
                c.length > 5 &&
                c.length < 60 &&
                !c.includes("₹") &&
                !c.includes("Seats") &&
                !/^\d{1,2}:\d{2}$/.test(c) &&
                !/^\d+h/.test(c)
              ) {
                op = c;
                break;
              }
            }

            if (price || dep) {
              results.push({
                operator: op || "Unknown Operator",
                busType: "N/A",
                departure: dep,
                arrival: arr,
                duration: dur || "N/A",
                price: price,
                priceFormatted: price
                  ? `₹${price.toLocaleString("en-IN")}`
                  : "N/A",
                rating: null,
                seatsAvailable: null,
                seatsText: "Check Availability",
              });
            }
            i += 8;
          } else {
            i++;
          }
        }
      }

      const seen = new Set();
      return results.filter((bus) => {
        const key = `${bus.operator}-${bus.departure}-${bus.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    console.log(`[Scraper] Extracted ${buses.length} buses.`);

    buses.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

    return {
      success: true,
      searchParams: {
        from: fromName,
        to: toName,
        date,
      },
      bookingUrl: url,
      totalBuses: buses.length,
      buses,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Scraper] Error:", error.message);
    return {
      success: false,
      error: error.message,
      searchParams: { from: fromName, to: toName, date },
      buses: [],
      totalBuses: 0,
    };
  } finally {
    if (busScraperBrowser) {
      await busScraperBrowser.close();
    }
  }
}

// ============================================================
//  5. API WRAPPERS & UTILITIES
// ============================================================
const cityIdCache = {};

for (const [name, info] of Object.entries(CITIES)) {
  cityIdCache[name.toLowerCase()] = { name, id: info.id, state: info.state };
}

function getTodayDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function isValidDate(dateStr) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return false;
  const [dd, mm, yyyy] = parts.map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return (
    d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd
  );
}

function isDateInPast(dateStr) {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  const inputDate = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

/**
 * Searches for cities combining static data and live autocomplete.
 */
async function searchCitiesAPI(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q || q.length < 2) {
    return {
      success: false,
      error: "Query must be at least 2 characters",
    };
  }

  const staticMatches = Object.entries(CITIES)
    .filter(
      ([name, info]) =>
        name.toLowerCase().includes(q) ||
        info.state.toLowerCase().includes(q)
    )
    .map(([name, info]) => ({ name, id: info.id, state: info.state }));

  const seen = new Set();
  const uniqueStatic = staticMatches.filter((c) => {
    const key = `${c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let liveResults = [];
  /* 
   * Speed optimization: We only invoke live Puppeteer scraping if the user types a query 
   * that misses our comprehensive local cache (like Rupnagar).
   */
  if (uniqueStatic.length < 2) {
    try {
      liveResults = await scrapeCitySuggestions(q);
      console.log(`[API] Live autocomplete for "${q}": ${liveResults.length} results`);
    } catch (err) {
      console.error(`[API] Live autocomplete failed for "${q}":`, err.message);
    }
  }

  const seenNames = new Set();
  const merged = [];

  for (const city of liveResults) {
    const key = city.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);

      const resolvedId = city.id || null;

      if (resolvedId) {
        const oldEntry = cityIdCache[key];
        cityIdCache[key] = { name: city.name, id: resolvedId, state: city.state || (oldEntry ? oldEntry.state : "") };
      }

      merged.push({
        name: city.name,
        id: resolvedId || (cityIdCache[key] ? cityIdCache[key].id : null),
        state: city.state || (cityIdCache[key] ? cityIdCache[key].state : ""),
        needsIdLookup: !resolvedId && !(cityIdCache[key] && cityIdCache[key].id),
      });
    }
  }

  for (const city of uniqueStatic) {
    const key = city.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      merged.push(city);
    }
  }

  return { success: true, total: merged.length, cities: merged };
}

/**
 * Resolves a city name to its AbhiBus ID.
 */
async function resolveCityAPI(name) {
  const n = (name || "").trim();
  if (!n) {
    return { success: false, error: "City name is required" };
  }

  const cached = cityIdCache[n.toLowerCase()];
  if (cached) {
    return { success: true, city: cached };
  }

  try {
    const cityInfo = await getCityId(n);
    if (cityInfo) {
      cityIdCache[n.toLowerCase()] = cityInfo;
      return { success: true, city: cityInfo };
    } else {
      return {
        success: false,
        error: `Could not resolve city ID for "${n}"`,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: "Failed to resolve city ID",
      details: err.message,
    };
  }
}

/**
 * Scrapes buses, automatically resolving city IDs if missing.
 */
async function searchBusesAPI({ from, to, date, fromId, toId }) {
  if (!from || !to) {
    return {
      success: false,
      error: "Missing required parameters: from, to",
    };
  }

  let fromCityId = fromId ? parseInt(fromId) : null;
  let fromState = "";

  if (!fromCityId) {
    const cached = cityIdCache[from.toLowerCase()];
    if (cached) {
      fromCityId = cached.id;
      fromState = cached.state;
    } else {
      try {
        const resolved = await getCityId(from);
        if (resolved) {
          fromCityId = resolved.id;
          fromState = resolved.state;
          cityIdCache[from.toLowerCase()] = resolved;
        }
      } catch {}
    }
  } else {
    const cached = cityIdCache[from.toLowerCase()];
    fromState = cached ? cached.state : "";
  }

  let toCityId = toId ? parseInt(toId) : null;
  let toState = "";

  if (!toCityId) {
    const cached = cityIdCache[to.toLowerCase()];
    if (cached) {
      toCityId = cached.id;
      toState = cached.state;
    } else {
      try {
        const resolved = await getCityId(to);
        if (resolved) {
          toCityId = resolved.id;
          toState = resolved.state;
          cityIdCache[to.toLowerCase()] = resolved;
        }
      } catch {}
    }
  } else {
    const cached = cityIdCache[to.toLowerCase()];
    toState = cached ? cached.state : "";
  }

  if (!fromCityId) {
    return {
      success: false,
      error: `Could not find AbhiBus ID for origin city: "${from}".`,
    };
  }

  if (!toCityId) {
    return {
      success: false,
      error: `Could not find AbhiBus ID for destination city: "${to}".`,
    };
  }

  if (fromCityId === toCityId) {
    return {
      success: false,
      error: "Origin and destination must be different",
    };
  }

  let searchDate = date;
  if (!searchDate) {
    searchDate = getTodayDate();
  }

  if (!isValidDate(searchDate)) {
    return {
      success: false,
      error: "Invalid date format. Use DD-MM-YYYY",
    };
  }

  if (isDateInPast(searchDate)) {
    return {
      success: false,
      error: "Date cannot be in the past",
    };
  }

  try {
    const startTime = Date.now();
    const result = await scrapeBuses({
      fromName: from,
      fromId: fromCityId,
      toName: to,
      toId: toCityId,
      date: searchDate,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    result.responseTime = `${elapsed}s`;
    result.searchParams.fromState = fromState;
    result.searchParams.toState = toState;

    return result;
  } catch (error) {
    return {
      success: false,
      error: "Failed to scrape bus data. Please try again.",
      details: error.message,
    };
  }
}

// Clean up resources on exit
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

module.exports = {
  // Constants & State
  CITIES,
  cityIdCache,

  // High-level API Methods
  searchCitiesAPI,
  resolveCityAPI,
  searchBusesAPI,

  // Low-level Scraper Methods
  scrapeCitySuggestions,
  getCityId,
  scrapeBuses,
  buildSearchURL,
  closeBrowser,

  // Utils
  getTodayDate,
  isValidDate,
  isDateInPast
};
