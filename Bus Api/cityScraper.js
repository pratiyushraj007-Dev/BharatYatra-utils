const puppeteer = require("puppeteer");

/**
 * AbhiBus City Autocomplete — Network Interception + DOM Extraction
 *
 * AbhiBus is a React SPA — there's no real server-side API endpoint.
 * The `/home/get_city_list?term=` URL only works within the React
 * app's internal routing (XHR from within the app's JS context).
 *
 * Strategy:
 *   1. Load AbhiBus homepage with a PERSISTENT page
 *   2. Set up network response listener to capture city API calls
 *   3. Type into the source input field to trigger autocomplete
 *   4. Capture the internal XHR/fetch response with city names + IDs
 *   5. Also read DOM as fallback to extract IDs from data attributes
 */

let browser = null;
let sessionPage = null;
let isInitializing = false;
let initPromise = null;

// All captured API responses (accumulated across queries)
let lastCapturedCities = [];

// ─── Browser & Persistent Page ─────────────────────────────────────────

async function ensureSession() {
  if (sessionPage && !sessionPage.isClosed() && browser && browser.connected) {
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

  if (browser && browser.connected) {
    try { await browser.close(); } catch {}
  }

  browser = await puppeteer.launch({
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

  sessionPage = await browser.newPage();

  await sessionPage.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  );

  // Set up PERSISTENT response listener to capture ALL city API responses
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

  // Load AbhiBus homepage — this also initializes their React app
  await sessionPage.goto("https://www.abhibus.com", {
    waitUntil: "networkidle2",
    timeout: 45000,
  });

  await new Promise((r) => setTimeout(r, 3000));
  console.log("[CityScraper] Session ready ✅");

  return sessionPage;
}

// ─── Request Queue ──────────────────────────────────────────────────────

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

// ═════════════════════════════════════════════════════════════════════════
//  Core: Type query and capture results
// ═════════════════════════════════════════════════════════════════════════

async function _typeAndCapture(page, query) {
  // Reset captured data
  lastCapturedCities = [];

  // Ensure we're on the homepage  
  const currentUrl = page.url();
  if (!currentUrl.includes("abhibus.com") || currentUrl.includes("bus_search")) {
    await page.goto("https://www.abhibus.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Dismiss any open dropdowns by clicking body
  await page.click("body").catch(() => {});
  await new Promise((r) => setTimeout(r, 300));

  // Find and clear the source input
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
        // Clear using React-compatible approach
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

  await new Promise((r) => setTimeout(r, 500));

  // Type the query — this triggers AbhiBus's React autocomplete
  // which internally calls their API
  await page.keyboard.type(query, { delay: 150 });

  // Wait for the API response and DOM update
  await new Promise((r) => setTimeout(r, 3000));

  // Check if network capture got results
  if (lastCapturedCities.length > 0) {
    console.log(`[CityScraper] ✅ Network capture: ${lastCapturedCities.length} cities for "${query}"`);
    const result = [...lastCapturedCities];

    // Clear the input
    await _clearInput(page);
    return result;
  }

  // Fallback: Read directly from the DOM autocomplete dropdown
  console.log(`[CityScraper] No network capture, reading DOM for "${query}"...`);

  const domCities = await page.evaluate(() => {
    const results = [];
    const seen = new Set();

    // AbhiBus React app renders autocomplete items
    // Try comprehensive selectors
    const allElements = document.querySelectorAll(
      "ul li, [class*='auto'] li, [class*='suggest'] li, [class*='Auto'] li, " +
      "[class*='Suggest'] li, [class*='dropdown'] li, [class*='Drop'] li, " +
      "[role='option'], [role='listbox'] > *, [class*='city'] li, [class*='City'] li, " +
      "[class*='list'] li, [class*='List'] li, [class*='result'] li"
    );

    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      // Only visible, reasonably-sized elements
      if (rect.height < 10 || rect.width < 50 || rect.top < 0 || rect.top > 800) continue;

      const text = (el.innerText || el.textContent || "").trim();
      if (!text || text.length < 2 || text.length > 100 || seen.has(text)) continue;
      seen.add(text);

      // Try to find ID in element or parent attributes
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

      // Parse city name and state from text
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

  // Clear input
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

// ═════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ═════════════════════════════════════════════════════════════════════════

async function scrapeCitySuggestions(query) {
  return enqueue(async () => {
    const page = await ensureSession();
    return await _typeAndCapture(page, query);
  });
}

async function getCityId(cityName) {
  const cities = await scrapeCitySuggestions(cityName);

  // Exact match
  const exact = cities.find(
    (c) => c.name.toLowerCase() === cityName.toLowerCase() && c.id
  );
  if (exact) {
    console.log(`[CityScraper] ✅ "${cityName}" → ID ${exact.id}`);
    return exact;
  }

  // Partial match
  const partial = cities.find(
    (c) => c.name.toLowerCase().includes(cityName.toLowerCase()) && c.id
  );
  if (partial) {
    console.log(`[CityScraper] ✅ "${cityName}" ≈ "${partial.name}" → ID ${partial.id}`);
    return partial;
  }

  // Any with ID
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
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

module.exports = {
  scrapeCitySuggestions,
  getCityId,
  closeBrowser,
};
