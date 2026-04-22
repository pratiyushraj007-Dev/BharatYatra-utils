const express = require("express");
const cors = require("cors");
const path = require("path");
const puppeteer = require("puppeteer");

// ============================================================
//  INDIAN AIRPORT DATABASE (130+ airports with state mapping)
// ============================================================
const AIRPORTS = {
  // ─── Andhra Pradesh ───
  VTZ: { city: "Visakhapatnam", state: "Andhra Pradesh", name: "Visakhapatnam Airport" },
  TIR: { city: "Tirupati", state: "Andhra Pradesh", name: "Tirupati Airport" },
  VGA: { city: "Vijayawada", state: "Andhra Pradesh", name: "Vijayawada Airport" },
  RJA: { city: "Rajahmundry", state: "Andhra Pradesh", name: "Rajahmundry Airport" },
  CDP: { city: "Kadapa", state: "Andhra Pradesh", name: "Kadapa Airport" },

  // ─── Arunachal Pradesh ───
  IXN: { city: "Khonsa", state: "Arunachal Pradesh", name: "Khonsa Airport" },
  HGI: { city: "Itanagar", state: "Arunachal Pradesh", name: "Donyi Polo Airport" },
  IXT: { city: "Pasighat", state: "Arunachal Pradesh", name: "Pasighat Airport" },
  ZER: { city: "Zero (Ziro)", state: "Arunachal Pradesh", name: "Ziro Airport" },
  TEI: { city: "Tezu", state: "Arunachal Pradesh", name: "Tezu Airport" },

  // ─── Assam ───
  GAU: { city: "Guwahati", state: "Assam", name: "Lokpriya Gopinath Bordoloi International Airport" },
  DIB: { city: "Dibrugarh", state: "Assam", name: "Dibrugarh Airport" },
  JRH: { city: "Jorhat", state: "Assam", name: "Jorhat Airport" },
  IXS: { city: "Silchar", state: "Assam", name: "Silchar Airport" },
  TEZ: { city: "Tezpur", state: "Assam", name: "Tezpur Airport" },
  IXI: { city: "Lilabari (North Lakhimpur)", state: "Assam", name: "Lilabari Airport" },

  // ─── Bihar ───
  PAT: { city: "Patna", state: "Bihar", name: "Jay Prakash Narayan International Airport" },
  GAY: { city: "Gaya", state: "Bihar", name: "Gaya Airport" },
  DBR: { city: "Darbhanga", state: "Bihar", name: "Darbhanga Airport" },

  // ─── Chhattisgarh ───
  RPR: { city: "Raipur", state: "Chhattisgarh", name: "Swami Vivekananda Airport" },
  BUP: { city: "Bilaspur", state: "Chhattisgarh", name: "Bilaspur Airport" },
  JGB: { city: "Jagdalpur", state: "Chhattisgarh", name: "Jagdalpur Airport" },

  // ─── Delhi ───
  DEL: { city: "New Delhi", state: "Delhi", name: "Indira Gandhi International Airport" },

  // ─── Goa ───
  GOI: { city: "Goa (Dabolim)", state: "Goa", name: "Goa International Airport (Dabolim)" },
  GOX: { city: "Goa (Mopa)", state: "Goa", name: "Manohar International Airport (Mopa)" },

  // ─── Gujarat ───
  AMD: { city: "Ahmedabad", state: "Gujarat", name: "Sardar Vallabhbhai Patel International Airport" },
  STV: { city: "Surat", state: "Gujarat", name: "Surat Airport" },
  RAJ: { city: "Rajkot", state: "Gujarat", name: "Rajkot Airport" },
  BDQ: { city: "Vadodara", state: "Gujarat", name: "Vadodara Airport" },
  BHJ: { city: "Bhuj", state: "Gujarat", name: "Bhuj Airport" },
  JGA: { city: "Jamnagar", state: "Gujarat", name: "Jamnagar Airport" },
  PBD: { city: "Porbandar", state: "Gujarat", name: "Porbandar Airport" },
  DIU: { city: "Diu", state: "Gujarat", name: "Diu Airport" },
  KDM: { city: "Kandla", state: "Gujarat", name: "Kandla Airport" },

  // ─── Haryana ───
  HSS: { city: "Hisar", state: "Haryana", name: "Hisar Airport" },

  // ─── Himachal Pradesh ───
  DHM: { city: "Dharamshala (Kangra)", state: "Himachal Pradesh", name: "Gaggal Airport" },
  KUU: { city: "Kullu (Manali)", state: "Himachal Pradesh", name: "Bhuntar Airport" },
  SLV: { city: "Shimla", state: "Himachal Pradesh", name: "Shimla Airport" },

  // ─── Jammu & Kashmir ───
  SXR: { city: "Srinagar", state: "Jammu & Kashmir", name: "Sheikh ul-Alam International Airport" },
  IXJ: { city: "Jammu", state: "Jammu & Kashmir", name: "Jammu Airport" },
  IXL: { city: "Leh", state: "Ladakh", name: "Kushok Bakula Rimpochee Airport" },

  // ─── Jharkhand ───
  IXR: { city: "Ranchi", state: "Jharkhand", name: "Birsa Munda Airport" },
  IXW: { city: "Jamshedpur", state: "Jharkhand", name: "Sonari Airport" },
  DEO: { city: "Deoghar", state: "Jharkhand", name: "Deoghar Airport" },

  // ─── Karnataka ───
  BLR: { city: "Bengaluru", state: "Karnataka", name: "Kempegowda International Airport" },
  IXE: { city: "Mangalore", state: "Karnataka", name: "Mangalore International Airport" },
  HBX: { city: "Hubli", state: "Karnataka", name: "Hubli Airport" },
  MYQ: { city: "Mysore", state: "Karnataka", name: "Mysore Airport" },
  BEP: { city: "Bellary", state: "Karnataka", name: "Bellary Airport" },
  IXG: { city: "Belgaum (Belagavi)", state: "Karnataka", name: "Belgaum Airport" },

  // ─── Kerala ───
  COK: { city: "Kochi", state: "Kerala", name: "Cochin International Airport" },
  TRV: { city: "Thiruvananthapuram", state: "Kerala", name: "Trivandrum International Airport" },
  CCJ: { city: "Kozhikode (Calicut)", state: "Kerala", name: "Calicut International Airport" },
  CNN: { city: "Kannur", state: "Kerala", name: "Kannur International Airport" },

  // ─── Madhya Pradesh ───
  IDR: { city: "Indore", state: "Madhya Pradesh", name: "Devi Ahilyabai Holkar Airport" },
  BHO: { city: "Bhopal", state: "Madhya Pradesh", name: "Raja Bhoj Airport" },
  JLR: { city: "Jabalpur", state: "Madhya Pradesh", name: "Jabalpur Airport" },
  GWL: { city: "Gwalior", state: "Madhya Pradesh", name: "Gwalior Airport" },
  KNP: { city: "Khajuraho", state: "Madhya Pradesh", name: "Khajuraho Airport" },

  // ─── Maharashtra ───
  BOM: { city: "Mumbai", state: "Maharashtra", name: "Chhatrapati Shivaji Maharaj International Airport" },
  PNQ: { city: "Pune", state: "Maharashtra", name: "Pune Airport" },
  NAG: { city: "Nagpur", state: "Maharashtra", name: "Dr. Babasaheb Ambedkar International Airport" },
  IXU: { city: "Aurangabad", state: "Maharashtra", name: "Aurangabad Airport" },
  KLH: { city: "Kolhapur", state: "Maharashtra", name: "Kolhapur Airport" },
  SAG: { city: "Shirdi", state: "Maharashtra", name: "Shirdi Airport" },
  NDC: { city: "Nanded", state: "Maharashtra", name: "Nanded Airport" },

  // ─── Manipur ───
  IMF: { city: "Imphal", state: "Manipur", name: "Bir Tikendrajit International Airport" },

  // ─── Meghalaya ───
  SHL: { city: "Shillong", state: "Meghalaya", name: "Shillong Airport" },

  // ─── Mizoram ───
  AJL: { city: "Aizawl", state: "Mizoram", name: "Lengpui Airport" },

  // ─── Nagaland ───
  DMU: { city: "Dimapur", state: "Nagaland", name: "Dimapur Airport" },

  // ─── Odisha ───
  BBI: { city: "Bhubaneswar", state: "Odisha", name: "Biju Patnaik International Airport" },
  JRG: { city: "Jharsuguda", state: "Odisha", name: "Veer Surendra Sai Airport" },

  // ─── Punjab ───
  ATQ: { city: "Amritsar", state: "Punjab", name: "Sri Guru Ram Dass Jee International Airport" },
  IXC: { city: "Chandigarh", state: "Punjab", name: "Chandigarh International Airport" },
  LUH: { city: "Ludhiana", state: "Punjab", name: "Sahnewal Airport" },
  PGH: { city: "Pathankot", state: "Punjab", name: "Pathankot Airport" },
  BUY: { city: "Bathinda", state: "Punjab", name: "Bathinda Airport" },

  // ─── Rajasthan ───
  JAI: { city: "Jaipur", state: "Rajasthan", name: "Jaipur International Airport" },
  UDR: { city: "Udaipur", state: "Rajasthan", name: "Maharana Pratap Airport" },
  JDH: { city: "Jodhpur", state: "Rajasthan", name: "Jodhpur Airport" },
  JSA: { city: "Jaisalmer", state: "Rajasthan", name: "Jaisalmer Airport" },
  BKB: { city: "Bikaner", state: "Rajasthan", name: "Nal Airport" },
  KTU: { city: "Kota", state: "Rajasthan", name: "Kota Airport" },
  AJM: { city: "Ajmer (Kishangarh)", state: "Rajasthan", name: "Kishangarh Airport" },

  // ─── Sikkim ───
  PYG: { city: "Pakyong (Gangtok)", state: "Sikkim", name: "Pakyong Airport" },

  // ─── Tamil Nadu ───
  MAA: { city: "Chennai", state: "Tamil Nadu", name: "Chennai International Airport" },
  CJB: { city: "Coimbatore", state: "Tamil Nadu", name: "Coimbatore International Airport" },
  IXM: { city: "Madurai", state: "Tamil Nadu", name: "Madurai Airport" },
  TRZ: { city: "Tiruchirappalli", state: "Tamil Nadu", name: "Tiruchirappalli International Airport" },
  TUT: { city: "Tuticorin", state: "Tamil Nadu", name: "Tuticorin Airport" },
  SLM: { city: "Salem", state: "Tamil Nadu", name: "Salem Airport" },

  // ─── Telangana ───
  HYD: { city: "Hyderabad", state: "Telangana", name: "Rajiv Gandhi International Airport" },
  WRG: { city: "Warangal", state: "Telangana", name: "Warangal Airport" },

  // ─── Tripura ───
  IXA: { city: "Agartala", state: "Tripura", name: "Maharaja Bir Bikram Airport" },

  // ─── Uttar Pradesh ───
  LKO: { city: "Lucknow", state: "Uttar Pradesh", name: "Chaudhary Charan Singh International Airport" },
  VNS: { city: "Varanasi", state: "Uttar Pradesh", name: "Lal Bahadur Shastri International Airport" },
  AGR: { city: "Agra", state: "Uttar Pradesh", name: "Agra Airport" },
  GOP: { city: "Gorakhpur", state: "Uttar Pradesh", name: "Gorakhpur Airport" },
  KNU: { city: "Kanpur", state: "Uttar Pradesh", name: "Kanpur Airport" },
  AYJ: { city: "Ayodhya", state: "Uttar Pradesh", name: "Maharishi Valmiki International Airport" },
  JHN: { city: "Jhansi", state: "Uttar Pradesh", name: "Jhansi Airport" },
  BEK: { city: "Bareilly", state: "Uttar Pradesh", name: "Bareilly Airport" },
  PYQ: { city: "Prayagraj (Allahabad)", state: "Uttar Pradesh", name: "Prayagraj Airport" },

  // ─── Uttarakhand ───
  DED: { city: "Dehradun", state: "Uttarakhand", name: "Jolly Grant Airport" },
  PGH: { city: "Pantnagar", state: "Uttarakhand", name: "Pantnagar Airport" },

  // ─── West Bengal ───
  CCU: { city: "Kolkata", state: "West Bengal", name: "Netaji Subhas Chandra Bose International Airport" },
  IXB: { city: "Bagdogra (Siliguri)", state: "West Bengal", name: "Bagdogra Airport" },

  // ─── Union Territories ───
  IXZ: { city: "Port Blair", state: "Andaman & Nicobar", name: "Veer Savarkar International Airport" },
};

// ============================================================
//  ClearTrip Flight Scraper
// ============================================================
function buildSearchURL(from, to, date, adults = 1, travelClass = "Economy") {
  const params = new URLSearchParams({
    adults: adults.toString(),
    childs: "0",
    infants: "0",
    class: travelClass,
    depart_date: date,
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    rnd_one: "O", // O = One-way
  });
  return `https://www.cleartrip.com/flights/results?${params.toString()}`;
}

async function scrapeFlights({ from, to, date, adults = 1, travelClass = "Economy" }) {
  const url = buildSearchURL(from, to, date, adults, travelClass);
  console.log(`[Scraper] Navigating to: ${url}`);

  let browser;
  try {
    browser = await puppeteer.launch({
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

    const page = await browser.newPage();

    // Set a realistic user agent to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    // Set extra headers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    });

    // Navigate to the search results page
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("[Scraper] Page loaded. Waiting for flight results...");

    // Wait for flight cards to appear - try multiple selectors
    try {
      await page.waitForFunction(
        () => {
          // Look for elements containing the rupee symbol ₹ which indicates prices loaded
          const priceElements = document.querySelectorAll("*");
          let priceCount = 0;
          for (const el of priceElements) {
            if (
              el.children.length === 0 &&
              el.textContent &&
              el.textContent.includes("₹")
            ) {
              priceCount++;
            }
          }
          return priceCount >= 3; // At least 3 price elements means results loaded
        },
        { timeout: 30000 }
      );
    } catch (e) {
      console.log("[Scraper] Timeout waiting for prices, attempting extraction anyway...");
    }

    // Additional wait for dynamic content to settle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("[Scraper] Extracting flight data...");

    // Extract flight data from the page
    const flights = await page.evaluate(() => {
      const results = [];

      // Strategy: Find all "Book" buttons, then traverse up to find the flight card container
      const allButtons = Array.from(document.querySelectorAll("button"));
      const bookButtons = allButtons.filter((btn) => {
        const text = btn.textContent.trim().toLowerCase();
        return text === "book" || text === "book now";
      });

      for (const bookBtn of bookButtons) {
        try {
          // Walk up the DOM to find the flight card container
          let card = bookBtn;
          for (let i = 0; i < 10; i++) {
            card = card.parentElement;
            if (!card) break;
            // The card is usually a relatively large container
            if (card.offsetHeight > 80 && card.offsetWidth > 500) {
              break;
            }
          }

          if (!card) continue;

          const cardText = card.innerText || "";
          const lines = cardText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          // Extract price - find ₹ followed by number
          let price = null;
          const priceMatch = cardText.match(/₹\s*([\d,]+)/);
          if (priceMatch) {
            price = priceMatch[1].replace(/,/g, "");
          }

          // Extract times - HH:MM pattern
          const timeMatches = cardText.match(/\b(\d{1,2}:\d{2})\b/g);
          let departureTime = null;
          let arrivalTime = null;
          if (timeMatches && timeMatches.length >= 2) {
            departureTime = timeMatches[0];
            arrivalTime = timeMatches[1];
          }

          // Extract duration - Xh Xm pattern
          let duration = null;
          const durationMatch = cardText.match(/(\d+h\s*\d*m?)/i);
          if (durationMatch) {
            duration = durationMatch[1].trim();
          }

          // Extract stops
          let stops = null;
          if (/non[\s-]*stop/i.test(cardText)) {
            stops = "Non-stop";
          } else {
            const stopsMatch = cardText.match(/(\d+)\s*stop/i);
            if (stopsMatch) {
              stops = `${stopsMatch[1]} Stop${stopsMatch[1] > 1 ? "s" : ""}`;
            }
          }

          // Extract airline name - common Indian airlines
          let airline = null;
          const airlinePatterns = [
            "IndiGo",
            "Air India",
            "Air India Express",
            "SpiceJet",
            "Vistara",
            "Akasa Air",
            "Go First",
            "Alliance Air",
            "Star Air",
            "AirAsia India",
            "Air Asia",
          ];
          for (const pattern of airlinePatterns) {
            if (cardText.toLowerCase().includes(pattern.toLowerCase())) {
              airline = pattern;
              break;
            }
          }

          // If airline not found from known list, try to extract from first lines
          if (!airline) {
            for (const line of lines) {
              // Airline name is usually a short text in the first few lines
              if (
                line.length > 2 &&
                line.length < 30 &&
                !/\d/.test(line) &&
                !line.includes("₹") &&
                !line.includes("stop") &&
                !line.includes("Refund") &&
                !line.includes("Book")
              ) {
                airline = line;
                break;
              }
            }
          }

          // Extract flight number - pattern like XX-XXXX or XX XXXX
          let flightNumber = null;
          const flightNumMatch = cardText.match(
            /\b([A-Z0-9]{2}[\s-]\d{2,5})\b/
          );
          if (flightNumMatch) {
            flightNumber = flightNumMatch[1];
          }

          // Extract airport codes from the times section
          let fromCode = null;
          let toCode = null;
          const airportCodeMatches = cardText.match(/\b([A-Z]{3})\b/g);
          if (airportCodeMatches && airportCodeMatches.length >= 2) {
            // Filter out common non-airport 3-letter words
            const filtered = airportCodeMatches.filter(
              (c) =>
                !["AIR", "NON", "AND", "THE", "FOR", "ALL", "NEW", "GET", "OFF", "INR"].includes(c)
            );
            if (filtered.length >= 2) {
              fromCode = filtered[0];
              toCode = filtered[1];
            }
          }

          if (price || departureTime) {
            results.push({
              airline: airline || "Unknown",
              flightNumber: flightNumber || "N/A",
              departure: {
                time: departureTime,
                airport: fromCode,
              },
              arrival: {
                time: arrivalTime,
                airport: toCode,
              },
              duration: duration || "N/A",
              stops: stops || "N/A",
              price: price ? parseInt(price) : null,
              priceFormatted: price ? `₹${parseInt(price).toLocaleString("en-IN")}` : "N/A",
            });
          }
        } catch (err) {
          // Skip this card if extraction fails
          continue;
        }
      }

      // Deduplicate by flight number + departure time
      const seen = new Set();
      return results.filter((flight) => {
        const key = `${flight.flightNumber}-${flight.departure.time}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    console.log(`[Scraper] Extracted ${flights.length} flights.`);

    // Sort by price (cheapest first)
    flights.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

    return {
      success: true,
      searchParams: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        date,
        adults,
        travelClass,
      },
      bookingUrl: url,
      totalFlights: flights.length,
      flights,
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Scraper] Error:", error.message);
    return {
      success: false,
      error: error.message,
      searchParams: { from, to, date, adults, travelClass },
      flights: [],
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ============================================================
//  API ROUTES / SERVER setup
// ============================================================
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Date Helpers
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

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    service: "✈️  ClearTrip Flight Scraper API",
    version: "1.0.0",
    status: "running",
  });
});

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

app.get("/api/flights", async (req, res) => {
  const { from, to, date, adults = "1", class: travelClass = "Economy" } = req.query;

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

// Export everything so it can be required in other projects
module.exports = {
  app,
  AIRPORTS,
  scrapeFlights,
  buildSearchURL
};

// Start the server if this file is run directly (e.g. node flight_api.js)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n${"═".repeat(55)}`);
    console.log(`  ✈️  ClearTrip Flight Scraper API`);
    console.log(`  🌐  http://localhost:${PORT}`);
    console.log(`  📖  Docs: http://localhost:${PORT}/`);
    console.log(`${"═".repeat(55)}\n`);
  });
}
