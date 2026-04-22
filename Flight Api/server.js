const express = require("express");
const cors = require("cors");
const path = require("path");
const { scrapeFlights } = require("./scraper");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
//  INDIAN AIRPORT DATABASE (130+ airports with state mapping)
// ============================================================
const AIRPORTS = require("./airports");

// ============================================================
//  UTILITY: Date Helpers
// ============================================================
function getDateString(daysFromNow = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function isValidDate(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return false;
  const [dd, mm, yyyy] = parts.map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
}

function isDateInPast(dateStr) {
  const [dd, mm, yyyy] = dateStr.split("/").map(Number);
  const inputDate = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

// ============================================================
//  API ROUTES
// ============================================================

/**
 * GET /
 * Serve the frontend
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * GET /api/health
 * Health check & API docs
 */
app.get("/api/health", (req, res) => {
  res.json({
    service: "✈️  ClearTrip Flight Scraper API",
    version: "1.0.0",
    status: "running",
  });
});

/**
 * GET /api/airports
 * Returns all supported airports
 */
app.get("/api/airports", (req, res) => {
  const airportList = Object.entries(AIRPORTS).map(([code, info]) => ({
    code,
    ...info,
  }));
  res.json({
    success: true,
    total: airportList.length,
    airports: airportList,
  });
});

/**
 * GET /api/airports/search
 * Search airports by city name or IATA code
 */
app.get("/api/airports/search", (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();
  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      error: "Query must be at least 2 characters",
    });
  }

  const matches = Object.entries(AIRPORTS)
    .filter(
      ([code, info]) =>
        code.toLowerCase().includes(query) ||
        info.city.toLowerCase().includes(query) ||
        info.name.toLowerCase().includes(query) ||
        (info.state && info.state.toLowerCase().includes(query))
    )
    .map(([code, info]) => ({ code, ...info }));

  res.json({ success: true, total: matches.length, airports: matches });
});

/**
 * GET /api/flights
 * Scrape one-way flight results from ClearTrip
 */
app.get("/api/flights", async (req, res) => {
  const { from, to, date, adults = "1", class: travelClass = "Economy" } = req.query;

  // Validation
  if (!from || !to || !date) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: from, to, date",
      example: "/api/flights?from=DEL&to=BOM&date=15/04/2026",
    });
  }

  if (from.toUpperCase() === to.toUpperCase()) {
    return res.status(400).json({
      success: false,
      error: "Origin and destination must be different",
    });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use DD/MM/YYYY",
    });
  }

  if (isDateInPast(date)) {
    return res.status(400).json({
      success: false,
      error: "Date cannot be in the past",
    });
  }

  const validClasses = ["Economy", "Business", "First"];
  if (!validClasses.includes(travelClass)) {
    return res.status(400).json({
      success: false,
      error: `Invalid class. Must be one of: ${validClasses.join(", ")}`,
    });
  }

  const adultsNum = parseInt(adults);
  if (isNaN(adultsNum) || adultsNum < 1 || adultsNum > 9) {
    return res.status(400).json({
      success: false,
      error: "Adults must be between 1 and 9",
    });
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[API] Flight Search Request`);
  console.log(`  From: ${from.toUpperCase()} → To: ${to.toUpperCase()}`);
  console.log(`  Date: ${date}  |  Adults: ${adultsNum}  |  Class: ${travelClass}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const startTime = Date.now();
    const result = await scrapeFlights({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      date,
      adults: adultsNum,
      travelClass,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`[API] Scraping completed in ${elapsed}s — ${result.totalFlights} flights found.`);

    // Enrich with airport info
    result.searchParams.fromAirport = AIRPORTS[from.toUpperCase()] || null;
    result.searchParams.toAirport = AIRPORTS[to.toUpperCase()] || null;
    result.responseTime = `${elapsed}s`;

    res.json(result);
  } catch (error) {
    console.error("[API] Scraping error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape flight data. Please try again.",
      details: error.message,
    });
  }
});

// ============================================================
//  START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`  ✈️  ClearTrip Flight Scraper API`);
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log(`  📖  Docs: http://localhost:${PORT}/`);
  console.log(`${"═".repeat(55)}\n`);
});
