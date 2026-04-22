const puppeteer = require("puppeteer");

/**
 * ClearTrip Flight Scraper
 * Scrapes one-way flight data from ClearTrip.com using Puppeteer.
 */

/**
 * Build the ClearTrip search URL for one-way flights
 * @param {string} from - Origin airport IATA code (e.g., "DEL")
 * @param {string} to - Destination airport IATA code (e.g., "BOM")
 * @param {string} date - Travel date in DD/MM/YYYY format
 * @param {number} adults - Number of adult passengers (default: 1)
 * @param {string} travelClass - Travel class: Economy, Business, First (default: "Economy")
 * @returns {string} - The full ClearTrip results URL
 */
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

/**
 * Scrape flight results from ClearTrip
 * @param {Object} options
 * @param {string} options.from - Origin IATA code
 * @param {string} options.to - Destination IATA code
 * @param {string} options.date - Travel date DD/MM/YYYY
 * @param {number} [options.adults=1] - Number of adults
 * @param {string} [options.travelClass="Economy"] - Travel class
 * @returns {Promise<Object>} - Scraped flight data
 */
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

module.exports = { scrapeFlights, buildSearchURL };
