const express = require("express");
const cors = require("cors");
const path = require("path");
const { scrapeBuses } = require("./scraper");
const { scrapeCitySuggestions, getCityId, closeBrowser } = require("./cityScraper");
const CITIES = require("./cities");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
//  In-memory cache for city IDs discovered at runtime
// ============================================================
const cityIdCache = {};

// Pre-populate cache from the static cities.js
for (const [name, info] of Object.entries(CITIES)) {
  cityIdCache[name.toLowerCase()] = { name, id: info.id, state: info.state };
}

// ============================================================
//  UTILITY: Date Helpers
// ============================================================
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

// ============================================================
//  API ROUTES
// ============================================================

/** GET / — Serve the frontend */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/** GET /api/health — Health check */
app.get("/api/health", (req, res) => {
  res.json({
    service: "🚌 AbhiBus Scraper API",
    version: "2.0.0",
    status: "running",
  });
});

/**
 * GET /api/cities/search?q=<query>
 * 
 * Hybrid city autocomplete:
 *  1. First returns instant matches from the static cities.js (fast)
 *  2. Then also fetches LIVE suggestions from AbhiBus via Puppeteer
 *  3. Merges and deduplicates results
 * 
 * This ensures ALL cities (including small ones like Rupnagar) are available.
 */
app.get("/api/cities/search", async (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();
  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      error: "Query must be at least 2 characters",
    });
  }

  // ── Step 1: Instant results from static cities ──
  const staticMatches = Object.entries(CITIES)
    .filter(
      ([name, info]) =>
        name.toLowerCase().includes(query) ||
        info.state.toLowerCase().includes(query)
    )
    .map(([name, info]) => ({ name, id: info.id, state: info.state }));

  // Deduplicate by ID
  const seen = new Set();
  const uniqueStatic = staticMatches.filter((c) => {
    const key = `${c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Step 2: Live results from AbhiBus autocomplete ──
  let liveResults = [];
  try {
    liveResults = await scrapeCitySuggestions(query);
    console.log(`[API] Live autocomplete for "${query}": ${liveResults.length} results`);
  } catch (err) {
    console.error(`[API] Live autocomplete failed for "${query}":`, err.message);
    // Fall back to static-only
  }

  // ── Step 3: Merge live + static, LIVE takes priority ──
  // Live IDs from AbhiBus network capture are always correct.
  // Static cities.js IDs may be outdated (e.g. Patna was 70, actually 5241).
  const seenNames = new Set();
  const merged = [];

  // Add LIVE results first — they have correct IDs from AbhiBus
  for (const city of liveResults) {
    const key = city.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);

      const resolvedId = city.id || null;

      // Cache live IDs (overwrite static ones — live is authoritative)
      if (resolvedId) {
        const oldEntry = cityIdCache[key];
        if (!oldEntry || oldEntry.id !== resolvedId) {
          console.log(`[Cache] ${oldEntry ? 'Updated' : 'Cached'} city: ${city.name} → ID ${resolvedId}${oldEntry ? ` (was ${oldEntry.id})` : ''}`);
        }
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

  // Add static results for cities NOT already in live results
  for (const city of uniqueStatic) {
    const key = city.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      merged.push(city);
    }
  }

  res.json({ success: true, total: merged.length, cities: merged });
});

/**
 * GET /api/cities/resolve?name=<city_name>
 *
 * Resolves a city name to its AbhiBus ID by selecting it on the homepage.
 * Used when a user selects a city that came from live autocomplete
 * and doesn't have an ID yet.
 */
app.get("/api/cities/resolve", async (req, res) => {
  const name = (req.query.name || "").trim();
  if (!name) {
    return res.status(400).json({ success: false, error: "City name is required" });
  }

  // Check cache first
  const cached = cityIdCache[name.toLowerCase()];
  if (cached) {
    return res.json({ success: true, city: cached });
  }

  console.log(`[API] Resolving city ID for "${name}"...`);

  try {
    const cityInfo = await getCityId(name);
    if (cityInfo) {
      // Cache the result
      cityIdCache[name.toLowerCase()] = cityInfo;
      console.log(`[API] Resolved: ${cityInfo.name} → ID ${cityInfo.id}`);
      return res.json({ success: true, city: cityInfo });
    } else {
      return res.status(404).json({
        success: false,
        error: `Could not resolve city ID for "${name}"`,
      });
    }
  } catch (err) {
    console.error(`[API] Resolve error for "${name}":`, err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to resolve city ID",
      details: err.message,
    });
  }
});

/**
 * GET /api/buses?from=<city>&to=<city>&date=<DD-MM-YYYY>
 *               &fromId=<id>&toId=<id>   (optional, skips lookup)
 *
 * Scrape bus results from AbhiBus.
 * Now also accepts fromId/toId directly from the frontend,
 * avoiding the need for a static cities.js lookup.
 */
app.get("/api/buses", async (req, res) => {
  let { from, to, date, fromId, toId } = req.query;

  // Validation
  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: from, to",
      example: "/api/buses?from=Hyderabad&to=Bangalore&date=20-04-2026",
    });
  }

  // ── Resolve origin city ID ──
  let fromCityId = fromId ? parseInt(fromId) : null;
  let fromState = "";

  if (!fromCityId) {
    // Check cache / static cities
    const cached = cityIdCache[from.toLowerCase()];
    if (cached) {
      fromCityId = cached.id;
      fromState = cached.state;
    } else {
      // Try live resolve
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

  // ── Resolve destination city ID ──
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
    return res.status(400).json({
      success: false,
      error: `Could not find AbhiBus ID for origin city: "${from}". Please select from autocomplete.`,
    });
  }

  if (!toCityId) {
    return res.status(400).json({
      success: false,
      error: `Could not find AbhiBus ID for destination city: "${to}". Please select from autocomplete.`,
    });
  }

  if (fromCityId === toCityId) {
    return res.status(400).json({
      success: false,
      error: "Origin and destination must be different",
    });
  }

  // Default to today if no date provided
  if (!date) {
    date = getTodayDate();
  }

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use DD-MM-YYYY",
    });
  }

  if (isDateInPast(date)) {
    return res.status(400).json({
      success: false,
      error: "Date cannot be in the past",
    });
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[API] Bus Search Request`);
  console.log(`  From: ${from} (ID: ${fromCityId}) → To: ${to} (ID: ${toCityId})`);
  console.log(`  Date: ${date}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const startTime = Date.now();
    const result = await scrapeBuses({
      fromName: from,
      fromId: fromCityId,
      toName: to,
      toId: toCityId,
      date,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[API] Scraping completed in ${elapsed}s — ${result.totalBuses} buses found.`
    );

    result.responseTime = `${elapsed}s`;
    result.searchParams.fromState = fromState;
    result.searchParams.toState = toState;

    res.json(result);
  } catch (error) {
    console.error("[API] Scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape bus data. Please try again.",
      details: error.message,
    });
  }
});

// ============================================================
//  CLEANUP
// ============================================================
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

// ============================================================
//  START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  🚌  AbhiBus Bus Scraper API v2`);
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log(`  📖  Frontend: http://localhost:${PORT}/`);
  console.log(`  🔍  City Search: http://localhost:${PORT}/api/cities/search?q=rup`);
  console.log(`  🆔  City Resolve: http://localhost:${PORT}/api/cities/resolve?name=Rupnagar`);
  console.log(`  🚍  Bus Search: http://localhost:${PORT}/api/buses?from=Hyderabad&to=Bangalore&date=${getTodayDate()}`);
  console.log(`${"═".repeat(55)}\n`);
});
