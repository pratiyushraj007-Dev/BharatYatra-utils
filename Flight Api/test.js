/**
 * Quick test script for the ClearTrip Flight Scraper
 * Run: node test.js
 */
const { scrapeFlights } = require("./scraper");

// Helper to get tomorrow's date in DD/MM/YYYY
function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function runTest() {
  const date = getTomorrowDate();
  console.log(`\n🧪 Testing ClearTrip Scraper`);
  console.log(`   Route: DEL → BOM`);
  console.log(`   Date:  ${date}\n`);

  const startTime = Date.now();
  const result = await scrapeFlights({
    from: "DEL",
    to: "BOM",
    date,
    adults: 1,
    travelClass: "Economy",
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.success) {
    console.log(`\n✅ Success! Found ${result.totalFlights} flights in ${elapsed}s\n`);
    console.log("─".repeat(80));
    console.log(
      `${"Airline".padEnd(20)} ${"Flight".padEnd(10)} ${"Dep".padEnd(8)} ${"Arr".padEnd(8)} ${"Duration".padEnd(10)} ${"Stops".padEnd(12)} Price`
    );
    console.log("─".repeat(80));

    result.flights.forEach((f) => {
      console.log(
        `${(f.airline || "N/A").padEnd(20)} ${(f.flightNumber || "N/A").padEnd(10)} ${(
          f.departure.time || "N/A"
        ).padEnd(8)} ${(f.arrival.time || "N/A").padEnd(8)} ${(f.duration || "N/A").padEnd(
          10
        )} ${(f.stops || "N/A").padEnd(12)} ${f.priceFormatted}`
      );
    });
    console.log("─".repeat(80));

    if (result.flights.length > 0) {
      const cheapest = result.flights[0];
      console.log(
        `\n💰 Cheapest: ${cheapest.airline} ${cheapest.flightNumber} — ${cheapest.priceFormatted}`
      );
    }
  } else {
    console.log(`\n❌ Failed: ${result.error}`);
  }

  console.log("");
}

runTest();
