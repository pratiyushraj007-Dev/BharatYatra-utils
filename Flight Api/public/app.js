/**
 * SkyScanner India — Frontend Application
 * Handles search, autocomplete, API calls, sorting, filtering, and rendering.
 */

// ============================================================
//  CONSTANTS & STATE
// ============================================================
const API_BASE = window.location.origin;

const AIRLINE_COLORS = {
  IndiGo: "#0047BA",
  "Air India": "#E53935",
  "Air India Express": "#C0392B",
  SpiceJet: "#FF6F00",
  Vistara: "#6A1B9A",
  "Akasa Air": "#FF6D00",
  "Go First": "#1B5E20",
  "Alliance Air": "#1565C0",
  "Star Air": "#4CAF50",
  "AirAsia India": "#D50000",
  "Air Asia": "#D50000",
};

const AIRLINE_INITIALS = {
  IndiGo: "6E",
  "Air India": "AI",
  "Air India Express": "IX",
  SpiceJet: "SG",
  Vistara: "UK",
  "Akasa Air": "QP",
  "Go First": "G8",
  "Alliance Air": "9I",
  "Star Air": "S5",
  "AirAsia India": "I5",
  "Air Asia": "AK",
};

let allFlights = [];
let currentSort = "price";
let filterNonstop = false;
let airportsCache = [];
let currentBookingUrl = "";

// ============================================================
//  DOM REFERENCES
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const fromInput = $("#from-input");
const fromCode = $("#from-code");
const fromDropdown = $("#from-dropdown");
const toInput = $("#to-input");
const toCode = $("#to-code");
const toDropdown = $("#to-dropdown");
const dateInput = $("#date-input");
const passengersInput = $("#passengers-input");
const classInput = $("#class-input");
const searchBtn = $("#search-btn");
const swapBtn = $("#swap-btn");
const loadingSection = $("#loading-section");
const resultsSection = $("#results-section");
const flightCards = $("#flight-cards");
const noResults = $("#no-results");
const errorState = $("#error-state");
const retryBtn = $("#retry-btn");

// ============================================================
//  INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initDate();
  loadAirports();
  bindEvents();
  initNavScroll();
});

function initDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = formatDateISO(new Date());
  dateInput.value = formatDateISO(tomorrow);
}

function formatDateISO(d) {
  return d.toISOString().split("T")[0];
}

function formatDateDDMMYYYY(isoDate) {
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function initNavScroll() {
  const navbar = $("#navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });
}

// ============================================================
//  AIRPORTS
// ============================================================
async function loadAirports() {
  try {
    const res = await fetch(`${API_BASE}/api/airports`);
    const data = await res.json();
    if (data.success) {
      airportsCache = data.airports;
    }
  } catch (err) {
    console.error("Failed to load airports:", err);
  }
}

function searchAirports(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return airportsCache.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.state && a.state.toLowerCase().includes(q))
  ).slice(0, 10);
}

// ============================================================
//  AUTOCOMPLETE (portal-style: dropdowns appended to body)
// ============================================================
function setupAutocomplete(input, codeInput, dropdown, excludeCode) {
  let timeout;

  // Move dropdown to body so it's never clipped by parent overflow/backdrop-filter
  document.body.appendChild(dropdown);
  dropdown.style.position = "fixed";
  dropdown.style.zIndex = "9999";

  function positionDropdown() {
    const rect = input.closest(".field-input-wrapper").getBoundingClientRect();
    dropdown.style.left = rect.left + "px";
    dropdown.style.top = (rect.bottom + 4) + "px";
    dropdown.style.width = rect.width + "px";
  }

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const query = input.value.trim();
      const results = searchAirports(query).filter(
        (a) => a.code !== excludeCode()
      );
      positionDropdown();
      renderDropdown(dropdown, results, input, codeInput);
    }, 150);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 1) {
      const results = searchAirports(input.value.trim()).filter(
        (a) => a.code !== excludeCode()
      );
      positionDropdown();
      renderDropdown(dropdown, results, input, codeInput);
    }
  });

  // Prevent dropdown click from triggering the body click-to-close
  dropdown.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== input) {
      dropdown.classList.remove("show");
    }
  });

  // Reposition on scroll/resize
  window.addEventListener("scroll", () => {
    if (dropdown.classList.contains("show")) positionDropdown();
  }, true);
  window.addEventListener("resize", () => {
    if (dropdown.classList.contains("show")) positionDropdown();
  });
}

function renderDropdown(dropdown, airports, input, codeInput) {
  if (airports.length === 0) {
    dropdown.classList.remove("show");
    return;
  }

  dropdown.innerHTML = airports
    .map(
      (a) => `
    <div class="autocomplete-item" data-code="${a.code}" data-city="${a.city}">
      <div class="autocomplete-code">${a.code}</div>
      <div class="autocomplete-info">
        <div class="autocomplete-city">${a.city}${a.state ? ` <span class="autocomplete-state">${a.state}</span>` : ''}</div>
        <div class="autocomplete-name">${a.name}</div>
      </div>
    </div>
  `
    )
    .join("");

  dropdown.classList.add("show");

  dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = item.dataset.code;
      const city = item.dataset.city;
      input.value = `${city} (${code})`;
      codeInput.value = code;
      dropdown.classList.remove("show");
    });
  });
}

// ============================================================
//  EVENT BINDINGS
// ============================================================
function bindEvents() {
  // Autocomplete for From
  setupAutocomplete(fromInput, fromCode, fromDropdown, () => toCode.value);

  // Autocomplete for To
  setupAutocomplete(toInput, toCode, toDropdown, () => fromCode.value);

  // Swap
  swapBtn.addEventListener("click", () => {
    const tempVal = fromInput.value;
    const tempCode = fromCode.value;
    fromInput.value = toInput.value;
    fromCode.value = toCode.value;
    toInput.value = tempVal;
    toCode.value = tempCode;
  });

  // Search
  searchBtn.addEventListener("click", handleSearch);

  // Enter key on inputs
  [fromInput, toInput, dateInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  });

  // Sort buttons
  $$(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".sort-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      renderFlights();
    });
  });

  // Filter non-stop
  $("#filter-nonstop").addEventListener("click", function () {
    this.classList.toggle("active");
    filterNonstop = this.classList.contains("active");
    renderFlights();
  });

  // Retry
  retryBtn.addEventListener("click", handleSearch);
}

// ============================================================
//  SEARCH HANDLER
// ============================================================
async function handleSearch() {
  const from = fromCode.value.trim().toUpperCase();
  const to = toCode.value.trim().toUpperCase();
  const date = dateInput.value;
  const adults = passengersInput.value;
  const travelClass = classInput.value;

  // Validation
  if (!from) {
    shakeElement(fromInput.parentElement.parentElement);
    fromInput.focus();
    return;
  }

  if (!to) {
    shakeElement(toInput.parentElement.parentElement);
    toInput.focus();
    return;
  }

  if (!date) {
    shakeElement(dateInput.parentElement);
    dateInput.focus();
    return;
  }

  if (from === to) {
    shakeElement(toInput.parentElement.parentElement);
    return;
  }

  // Show loading
  showLoading();

  try {
    const formattedDate = formatDateDDMMYYYY(date);
    const url = `${API_BASE}/api/flights?from=${from}&to=${to}&date=${encodeURIComponent(formattedDate)}&adults=${adults}&class=${encodeURIComponent(travelClass)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.flights.length > 0) {
      allFlights = data.flights;
      showResults(data);
    } else if (data.success && data.flights.length === 0) {
      showNoResults();
    } else {
      showError(data.error || "Failed to fetch flights");
    }
  } catch (err) {
    console.error("Search error:", err);
    showError("Network error. Make sure the server is running.");
  }
}

// ============================================================
//  UI STATE MANAGEMENT
// ============================================================
function showLoading() {
  loadingSection.classList.add("show");
  resultsSection.classList.remove("show");
  noResults.classList.remove("show");
  errorState.classList.remove("show");
  searchBtn.disabled = true;
  searchBtn.innerHTML = `
    <div class="loading-dots" style="justify-content:center;gap:4px">
      <span style="width:6px;height:6px"></span>
      <span style="width:6px;height:6px"></span>
      <span style="width:6px;height:6px"></span>
    </div>
    Searching...
  `;
}

function hideLoading() {
  loadingSection.classList.remove("show");
  searchBtn.disabled = false;
  searchBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    Search Flights
  `;
}

function showResults(data) {
  hideLoading();
  resultsSection.classList.add("show");
  noResults.classList.remove("show");
  errorState.classList.remove("show");

  currentBookingUrl = data.bookingUrl || "";

  // Update header
  $("#route-from").textContent = data.searchParams.from;
  $("#route-to").textContent = data.searchParams.to;
  $("#results-count").textContent = `${data.totalFlights} flights found`;
  $("#results-time").textContent = `Scraped in ${data.responseTime}`;

  renderFlights();

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showNoResults() {
  hideLoading();
  resultsSection.classList.add("show");
  noResults.classList.add("show");
  flightCards.innerHTML = "";
  errorState.classList.remove("show");
}

function showError(message) {
  hideLoading();
  resultsSection.classList.add("show");
  errorState.classList.add("show");
  flightCards.innerHTML = "";
  noResults.classList.remove("show");
  $("#error-message").textContent = message;
}

function shakeElement(el) {
  el.style.animation = "none";
  el.offsetHeight; // trigger reflow
  el.style.animation = "shake 0.5s ease-in-out";
  setTimeout(() => (el.style.animation = ""), 500);
}

// Add shake animation
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

// ============================================================
//  RENDER FLIGHTS
// ============================================================
function renderFlights() {
  let flights = [...allFlights];

  // Filter
  if (filterNonstop) {
    flights = flights.filter(
      (f) => f.stops && f.stops.toLowerCase().includes("non")
    );
  }

  // Sort
  switch (currentSort) {
    case "price":
      flights.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
      break;
    case "departure":
      flights.sort((a, b) => {
        const tA = timeToMinutes(a.departure?.time);
        const tB = timeToMinutes(b.departure?.time);
        return tA - tB;
      });
      break;
    case "duration":
      flights.sort((a, b) => {
        const dA = durationToMinutes(a.duration);
        const dB = durationToMinutes(b.duration);
        return dA - dB;
      });
      break;
  }

  // Update count
  $("#results-count").textContent = `${flights.length} flights found`;

  if (flights.length === 0) {
    flightCards.innerHTML = "";
    noResults.classList.add("show");
    return;
  }

  noResults.classList.remove("show");

  // Find cheapest price
  const cheapestPrice = Math.min(...flights.map((f) => f.price || Infinity));

  flightCards.innerHTML = flights
    .map((f, i) => {
      const isCheapest = f.price === cheapestPrice && i === 0;
      const airlineColor = AIRLINE_COLORS[f.airline] || "#6366f1";
      const airlineInitial = AIRLINE_INITIALS[f.airline] || f.airline?.charAt(0) || "?";
      const isNonstop = f.stops && f.stops.toLowerCase().includes("non");

      return `
      <div class="flight-card ${isCheapest ? "cheapest" : ""}" style="animation-delay: ${i * 0.05}s; position: relative;">
        <div class="flight-airline">
          <div class="airline-logo" style="background: ${airlineColor}15; border-color: ${airlineColor}30; color: ${airlineColor}">
            <span style="font-weight:800; font-size:13px; font-family:var(--font-primary);">${airlineInitial}</span>
          </div>
          <div class="airline-details">
            <div class="airline-name">${escapeHtml(f.airline)}</div>
            <div class="flight-number">${escapeHtml(f.flightNumber)}</div>
          </div>
        </div>

        <div class="flight-times">
          <div class="time-block">
            <div class="time-value">${escapeHtml(f.departure?.time || "—")}</div>
            <div class="time-code">${escapeHtml(f.departure?.airport || "")}</div>
          </div>
          <div class="time-connector">
            <div class="time-duration">${escapeHtml(f.duration)}</div>
            <div class="time-line"></div>
          </div>
          <div class="time-block">
            <div class="time-value">${escapeHtml(f.arrival?.time || "—")}</div>
            <div class="time-code">${escapeHtml(f.arrival?.airport || "")}</div>
          </div>
        </div>

        <div class="flight-stops">
          <span class="stops-value ${isNonstop ? "stops-nonstop" : "stops-connecting"}">
            ${escapeHtml(f.stops || "N/A")}
          </span>
        </div>

        <div class="flight-actions">
          <div class="flight-price">
            <div class="price-value">${escapeHtml(f.priceFormatted)}</div>
            <div class="price-label">per person</div>
          </div>
          <a href="${currentBookingUrl}" target="_blank" class="book-btn">
            Book
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    `;
    })
    .join("");
}

// ============================================================
//  UTILITIES
// ============================================================
function timeToMinutes(time) {
  if (!time) return Infinity;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function durationToMinutes(duration) {
  if (!duration) return Infinity;
  let total = 0;
  const hMatch = duration.match(/(\d+)h/);
  const mMatch = duration.match(/(\d+)m/);
  if (hMatch) total += parseInt(hMatch[1]) * 60;
  if (mMatch) total += parseInt(mMatch[1]);
  return total || Infinity;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
