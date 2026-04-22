const puppeteer = require("puppeteer");

/**
 * AbhiBus Bus Scraper
 * Scrapes bus listings from AbhiBus.com using Puppeteer.
 *
 * URL Pattern: /bus_search/{origin}/{origin_id}/{dest}/{dest_id}/{DD-MM-YYYY}/O
 */

/**
 * Build the AbhiBus search URL
 */
function buildSearchURL(fromName, fromId, toName, toId, date) {
  // AbhiBus uses city names in URL (capitalize first letter)
  const formatName = (name) =>
    encodeURIComponent(name.charAt(0).toUpperCase() + name.slice(1));
  return `https://www.abhibus.com/bus_search/${formatName(fromName)}/${fromId}/${formatName(toName)}/${toId}/${date}/O`;
}

/**
 * Scrape bus results from AbhiBus
 * @param {Object} options
 * @param {string} options.fromName - Origin city name
 * @param {number} options.fromId   - Origin city AbhiBus ID
 * @param {string} options.toName   - Destination city name
 * @param {number} options.toId     - Destination city AbhiBus ID
 * @param {string} options.date     - Travel date DD-MM-YYYY
 * @returns {Promise<Object>} - Scraped bus data
 */
async function scrapeBuses({ fromName, fromId, toName, toId, date }) {
  const url = buildSearchURL(fromName, fromId, toName, toId, date);
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

    // Realistic user-agent to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    });

    // Navigate to search results
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("[Scraper] Page loaded. Waiting for bus results...");

    // Wait for bus cards to appear
    try {
      await page.waitForFunction(
        () => {
          const body = document.body.innerText || "";
          // Look for indicators that results have loaded
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

    // Let dynamic content settle
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Scroll down to trigger lazy-loaded items
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 800);
        await new Promise((r) => setTimeout(r, 500));
      }
      window.scrollTo(0, 0);
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("[Scraper] Extracting bus data...");

    // Extract bus data from the page
    const buses = await page.evaluate(() => {
      const results = [];
      const body = document.body.innerText || "";

      // Check for no results
      if (
        body.includes("No buses found") ||
        body.includes("Oops! No buses") ||
        body.includes("0 Buses Found")
      ) {
        return results;
      }

      // Strategy 1: Find all "Select Seats" buttons and traverse up to bus cards
      const allButtons = Array.from(document.querySelectorAll("button"));
      const selectButtons = allButtons.filter((btn) => {
        const text = btn.textContent.trim().toLowerCase();
        return (
          text.includes("select seat") ||
          text.includes("book now") ||
          text.includes("view seat")
        );
      });

      // Also try finding cards by looking for price indicators and traversing up
      const priceElements = Array.from(
        document.querySelectorAll("*")
      ).filter(
        (el) =>
          el.children.length === 0 &&
          el.textContent &&
          /^₹\s*[\d,]+$/.test(el.textContent.trim())
      );

      // Combine both approaches - collect unique card containers
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
          
          // Skip if too short or already processed similar text
          if (cardText.length < 30) continue;
          const signature = cardText.substring(0, 80);
          if (processedTexts.has(signature)) continue;
          processedTexts.add(signature);

          const lines = cardText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          // ── Extract Price ──
          // AbhiBus shows multiple prices on each card:
          //   "Save ₹50"     → discount badge (ignore this)
          //   "₹ 2000"       → original price (crossed out)
          //   "From ₹ 1950"  → starting price (THIS is what we want)
          let price = null;

          // Priority 1: Look for "From ₹..." or "Starting from ₹..."
          const fromPriceMatch = cardText.match(/(?:From|Starting\s*from|Starts?\s*(?:at|from))\s*₹\s*([\d,]+)/i);
          if (fromPriceMatch) {
            price = parseInt(fromPriceMatch[1].replace(/,/g, ""));
          }

          // Priority 2: Find ALL ₹ amounts, filter out "Save ₹X", take the lowest real price
          if (!price) {
            const allPrices = [];
            // Match all ₹ amounts but skip ones preceded by "Save"
            const priceRegex = /₹\s*([\d,]+)/g;
            let pm;
            while ((pm = priceRegex.exec(cardText)) !== null) {
              const val = parseInt(pm[1].replace(/,/g, ""));
              // Check if this price is preceded by "Save" (discount badge)
              const before = cardText.substring(Math.max(0, pm.index - 10), pm.index);
              if (/save\s*$/i.test(before)) continue; // Skip "Save ₹50"
              if (val > 0 && val < 50000) allPrices.push(val);
            }
            // Take the lowest price (which is the "from" price)
            if (allPrices.length > 0) {
              price = Math.min(...allPrices);
            }
          }

          // ── Extract Times ──
          let departureTime = null;
          let arrivalTime = null;
          const timeMatches = cardText.match(/\b(\d{1,2}:\d{2})\b/g);
          if (timeMatches && timeMatches.length >= 2) {
            departureTime = timeMatches[0];
            arrivalTime = timeMatches[1];
          } else if (timeMatches && timeMatches.length === 1) {
            departureTime = timeMatches[0];
          }

          // ── Extract Duration ──
          let duration = null;
          const durationMatch = cardText.match(
            /(\d+)\s*h[.\s]*(\d*)\s*m/i
          );
          if (durationMatch) {
            const h = durationMatch[1];
            const m = durationMatch[2] || "0";
            duration = `${h}h ${m}m`;
          }

          // ── Extract Operator Name ──
          let operator = null;
          // The operator name is typically one of the first lines, 
          // is a text without digits/₹ and is reasonably long
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

          // ── Extract Bus Type ──
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
            // Also check if the line looks like a bus type descriptor
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

          // If busType matches operator, try next line
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

          // ── Extract Rating ──
          let rating = null;
          const ratingMatch = cardText.match(
            /(\d+\.?\d*)\s*(?:\/\s*5|★|star|rating)/i
          );
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
          } else {
            // Look for standalone decimal numbers that look like ratings (1.0-5.0)
            const ratingMatch2 = cardText.match(/\b([1-5]\.\d)\b/);
            if (ratingMatch2) {
              rating = parseFloat(ratingMatch2[1]);
            }
          }

          // ── Extract Seats Available ──
          let seatsAvailable = null;
          const seatsMatch = cardText.match(/(\d+)\s*Seats?\s*(?:Left|Available)/i);
          if (seatsMatch) {
            seatsAvailable = parseInt(seatsMatch[1]);
          }

          // Only add if we have at least price or departure time
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

      // ── Strategy 2: Text-based fallback extraction ──
      if (results.length === 0) {
        // Parse the entire page text line by line
        const allLines = body
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        let i = 0;
        while (i < allLines.length) {
          const line = allLines[i];
          // Look for time patterns as anchors
          const timeMatch = line.match(/^(\d{1,2}:\d{2})$/);
          if (timeMatch) {
            // Scan around this area for bus info
            const context = allLines.slice(Math.max(0, i - 5), i + 10);
            const contextText = context.join(" ");

            let price = null;
            // Priority: "From ₹..." price
            const fromPm = contextText.match(/(?:From|Starting\s*from)\s*₹\s*([\d,]+)/i);
            if (fromPm) {
              price = parseInt(fromPm[1].replace(/,/g, ""));
            } else {
              // Fallback: find all ₹ amounts, skip "Save ₹X", take lowest
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
            // Next time pattern is arrival
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
            i += 8; // Skip ahead past this block
          } else {
            i++;
          }
        }
      }

      // Deduplicate by operator + departure time
      const seen = new Set();
      return results.filter((bus) => {
        const key = `${bus.operator}-${bus.departure}-${bus.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    console.log(`[Scraper] Extracted ${buses.length} buses.`);

    // Sort by price (cheapest first)
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
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeBuses, buildSearchURL };
