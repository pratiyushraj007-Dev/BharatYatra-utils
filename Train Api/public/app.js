// ═══════════════════════════════════════════════════════════════════════════════
// RailScanner – Frontend Logic (Date-Specific Search)
// ═══════════════════════════════════════════════════════════════════════════════

let allTrains = [];
let nearbyTrainsData = [];
let nearbyStationSuggs = [];
let curFilter = 'all';
let selectedDate = ''; // DD-MM-YYYY
let currentFrom = '';
let currentTo = '';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchForm   = $('searchForm');
const fromInput    = $('fromInput');
const toInput      = $('toInput');
const fromCode     = $('fromCode');
const toCode       = $('toCode');
const fromDrop     = $('fromDrop');
const toDrop       = $('toDrop');
const dateInput    = $('dateInput');
const searchBtn    = $('searchBtn');
const loaderSec    = $('loaderSection');
const errorSec     = $('errorSection');
const resultsSec   = $('resultsSection');
const trainCards   = $('trainCards');
const sortSel      = $('sortSel');
const noMatch      = $('noMatch');

// ─── Initialize date picker ─────────────────────────────────────────────────
function initDatePicker() {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 120); // Allow up to 120 days ahead

  // Format for input[type=date] (YYYY-MM-DD)
  const toISODate = d => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  dateInput.min = toISODate(today);
  dateInput.max = toISODate(maxDate);
  dateInput.value = toISODate(today);

  // Set the initial selectedDate in DD-MM-YYYY format
  updateSelectedDate();
}

function updateSelectedDate() {
  // Convert YYYY-MM-DD (HTML input format) to DD-MM-YYYY (ConfirmTkt format)
  const rawVal = dateInput.value; // e.g. "2026-04-24"
  const parts = rawVal.split('-'); // ["2026", "04", "24"]
  if (parts.length === 3) {
    selectedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // "24-04-2026"
  }
  console.log(`[DATE] Input: ${rawVal} → API date: ${selectedDate}`);
}

// Update selectedDate whenever the date input changes
dateInput.addEventListener('change', updateSelectedDate);

function getSelectedDateStr() {
  return selectedDate;
}

function getSelectedDateForDisplay() {
  const parts = selectedDate.split('-');
  if (parts.length !== 3) return selectedDate;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(+parts[2], +parts[1]-1, +parts[0]);
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `${dayNames[d.getDay()]}, ${+parts[0]} ${months[+parts[1]-1]} ${parts[2]}`;
}

function getShortDateDisplay() {
  const parts = selectedDate.split('-');
  if (parts.length !== 3) return selectedDate;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${+parts[0]} ${months[+parts[1]-1]} ${parts[2]}`;
}

initDatePicker();

// ─── Autocomplete ────────────────────────────────────────────────────────────
let acTimer = null;

function initAC(input, dropdown, codeInput) {
  input.addEventListener('input', () => {
    clearTimeout(acTimer);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.classList.remove('open'); return; }

    acTimer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/stations?q=${encodeURIComponent(q)}`);
        const list = await r.json();
        if (!list.length) { dropdown.classList.remove('open'); return; }
        dropdown.innerHTML = list.map(s =>
          `<div class="dd-item" data-name="${esc(s.name)}" data-code="${esc(s.code)}">
            <span class="dd-name">${highlight(s.name, q)}</span>
            <span class="dd-code">${esc(s.code)}</span>
          </div>`
        ).join('');
        dropdown.classList.add('open');
        dropdown.querySelectorAll('.dd-item').forEach(it => {
          it.addEventListener('click', () => {
            input.value = it.dataset.name;
            codeInput.value = it.dataset.code;
            dropdown.classList.remove('open');
          });
        });
      } catch (e) { console.error(e); }
    }, 200);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest(`#${input.parentElement.id}`)) dropdown.classList.remove('open');
  });

  // Keyboard nav
  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.dd-item');
    if (!items.length) return;
    const cur = dropdown.querySelector('.dd-item.hl');
    let idx = cur ? Array.from(items).indexOf(cur) : -1;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx+1, items.length-1); items.forEach(i=>i.classList.remove('hl')); items[idx].classList.add('hl'); items[idx].scrollIntoView({block:'nearest'}); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx-1, 0); items.forEach(i=>i.classList.remove('hl')); items[idx].classList.add('hl'); items[idx].scrollIntoView({block:'nearest'}); }
    else if (e.key === 'Enter' && cur) { e.preventDefault(); input.value=cur.dataset.name; codeInput.value=cur.dataset.code; dropdown.classList.remove('open'); }
  });
}
initAC(fromInput, fromDrop, fromCode);
initAC(toInput, toDrop, toCode);

// ─── Swap ────────────────────────────────────────────────────────────────────
$('swapBtn').addEventListener('click', () => {
  [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
  [fromCode.value, toCode.value]   = [toCode.value, fromCode.value];
});

// ─── Search ──────────────────────────────────────────────────────────────────
searchForm.addEventListener('submit', async e => {
  e.preventDefault();
  const fromName = fromInput.value.trim(), toName = toInput.value.trim();
  const from = fromCode.value.trim() || fromName;
  const to = toCode.value.trim() || toName;
  if (!from || !to) return;

  currentFrom = from;
  currentTo = to;
  updateSelectedDate();

  show('loader');
  searchBtn.disabled = true;

  try {
    const apiUrl = `/api/trains?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(selectedDate)}`;
    console.log(`[SEARCH] API URL: ${apiUrl}`);
    const res = await fetch(apiUrl);
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || e.suggestion || 'Failed'); }
    const data = await res.json();
    if (!data.success || (!data.trains.length && (!data.nearbyTrains || !data.nearbyTrains.length)))
      throw new Error('No trains found for this route on the selected date.');

    allTrains = data.trains;
    nearbyTrainsData = data.nearbyTrains || [];
    nearbyStationSuggs = data.nearbyStationSuggestions || [];

    renderBanner(data);
    renderDateDisplay();
    renderCards(allTrains);
    renderNearbySection();
    show('results');
    resultsSec.scrollIntoView({ behavior:'smooth', block:'start' });
  } catch (err) {
    $('errTitle').textContent = 'No Results';
    $('errMsg').textContent = err.message;
    show('error');
  } finally {
    searchBtn.disabled = false;
  }
});

// ─── Show section ────────────────────────────────────────────────────────────
function show(s) {
  loaderSec.classList.add('hidden');
  errorSec.classList.add('hidden');
  resultsSec.classList.add('hidden');
  if (s==='loader')  loaderSec.classList.remove('hidden');
  if (s==='error')   errorSec.classList.remove('hidden');
  if (s==='results') resultsSec.classList.remove('hidden');
}
function resetUI() { show(null); fromInput.focus(); }

// ─── Route Banner ────────────────────────────────────────────────────────────
function renderBanner(d) {
  $('rFrom').textContent = d.from;
  $('rTo').textContent   = d.to;
  const totalCount = (d.trains?.length || 0) + (d.nearbyTrains?.length || 0);
  $('rTotal').textContent = `🚂 ${d.trains?.length || 0} direct train${d.trains?.length !== 1 ? 's' : ''}`;
  $('rDist').textContent  = d.distance ? `📍 ${d.distance}` : '';
  $('rDist').style.display = d.distance ? '' : 'none';
  $('rDate').textContent = `📅 ${getShortDateDisplay()}`;
  $('rLink').href = d.pageUrl || '#';
}

// ─── Selected Date Display (in results) ─────────────────────────────────────
function renderDateDisplay() {
  const dateBar = $('dateBar');
  if (!dateBar) return;

  dateBar.innerHTML = `<div class="date-display-inner">
    <div class="date-display-left">
      <span class="date-icon">📅</span>
      <div class="date-info">
        <span class="date-selected-label">Travel Date</span>
        <span class="date-selected-val">${getSelectedDateForDisplay()}</span>
      </div>
    </div>
    <button class="date-change-btn" id="changeDateBtn">
      <span>🔄</span> Change Date
    </button>
  </div>`;

  $('changeDateBtn')?.addEventListener('click', () => {
    // Scroll to search section and focus the date input
    $('searchSection').scrollIntoView({ behavior:'smooth', block:'start' });
    setTimeout(() => dateInput.focus(), 500);
  });
}

// ─── Render Train Cards ─────────────────────────────────────────────────────
function renderCards(trains) {
  const filtered = filterTrains(trains);
  const sorted   = sortTrains(filtered);
  noMatch.classList.toggle('hidden', sorted.length > 0);

  trainCards.innerHTML = sorted.map((t, i) => buildTrainCard(t, i, false)).join('');
}

function buildTrainCard(t, i, isNearby) {
  const classesHtml = renderClasses(t);
  const lowest = lowestPrice(t);
  const delay = Math.min(i * 0.04, .8);
  const selectedDateStr = getSelectedDateStr();

  const schedLink = `https://www.confirmtkt.com/train-schedule/${t.number}`;
  const bookLink  = t.classes.length
    ? t.classes[0].link
    : `https://www.confirmtkt.com/rbooking/trains/from/${esc(t.src)}/to/${esc(t.dst)}/${selectedDateStr}`;

  // Calculate duration if both times available
  let durationHtml = '';
  if (t.departure && t.arrival) {
    const [dh,dm] = t.departure.split(':').map(Number);
    const [ah,am] = t.arrival.split(':').map(Number);
    let mins = (ah*60+am) - (dh*60+dm);
    if (mins < 0) mins += 24*60;
    const h = Math.floor(mins/60), mn = mins%60;
    durationHtml = `<span class="tc-dur">${h}h ${mn}m</span>`;
  } else if (t.duration) {
    durationHtml = `<span class="tc-dur">${esc(t.duration)}</span>`;
  }

  // Nearby station info badges
  let nearbyBadges = '';
  if (isNearby) {
    nearbyBadges = '<span class="tc-nearby-badge">📍 Nearby Station</span>';
    if (t.nearbyFromDist) {
      nearbyBadges += `<span class="tc-dist-badge">🚉 ${esc(t.nearbyFromStn || t.src)} (${esc(t.nearbyFromDist)} away)</span>`;
    }
    if (t.nearbyToDist) {
      nearbyBadges += `<span class="tc-dist-badge">🚉 ${esc(t.nearbyToStn || t.dst)} (${esc(t.nearbyToDist)} away)</span>`;
    }
  }

  return `
  <div class="tcard ${isNearby ? 'nearby-card' : ''}" style="animation-delay:${delay}s">
    <div class="tc-top">
      <div class="tc-info">
        <span class="tc-num">${esc(t.number)}</span>
        <span class="tc-name">${esc(t.name)}</span>
        ${nearbyBadges}
      </div>
      <div class="tc-times">
        <div class="tc-time">
          <div class="tc-time-val">${t.departure || '—'}</div>
          <div class="tc-time-lbl">${esc(t.src) || 'Depart'}</div>
        </div>
        <div class="tc-arr">
          ${durationHtml}
          <svg width="36" height="12" viewBox="0 0 36 12"><line x1="0" y1="6" x2="30" y2="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/><polygon points="29,2 36,6 29,10" fill="currentColor"/></svg>
        </div>
        <div class="tc-time">
          <div class="tc-time-val">${t.arrival || '—'}</div>
          <div class="tc-time-lbl">${esc(t.dst) || 'Arrive'}</div>
        </div>
      </div>
    </div>

    ${classesHtml
      ? `<div class="tc-classes">${classesHtml}</div>`
      : `<div style="padding:12px 22px;text-align:center;color:var(--txt3);font-size:.82rem;border-bottom:1px solid var(--border)">Click "Book on ConfirmTkt" to check availability</div>`
    }

    <div class="tc-foot">
      <div class="tc-route">
        ${t.src ? `<span class="tc-stn">${esc(t.src)}</span>` : ''}
        ${t.src && t.dst ? `<span>→</span>` : ''}
        ${t.dst ? `<span class="tc-stn">${esc(t.dst)}</span>` : ''}
        ${lowest ? `<span class="tc-foot-price">from ${lowest}</span>` : ''}
      </div>
      <div class="tc-btns">
        <a href="${esc(schedLink)}" target="_blank" rel="noopener" class="t-btn btn-sched">📅 Schedule</a>
        <a href="${esc(bookLink)}" target="_blank" rel="noopener" class="t-btn btn-ctkt">🎫 Book on ConfirmTkt</a>
        <a href="https://www.irctc.co.in/nget/booking/train-list" target="_blank" rel="noopener" class="t-btn btn-irctc">🚃 Book on IRCTC</a>
      </div>
    </div>
  </div>`;
}

// ─── Nearby Station Section ──────────────────────────────────────────────────
function renderNearbySection() {
  const container = $('nearbySection');
  if (!container) return;

  const hasNearby = nearbyTrainsData && nearbyTrainsData.length > 0;
  const hasSuggs  = nearbyStationSuggs && nearbyStationSuggs.length > 0;

  if (!hasNearby && !hasSuggs) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  let html = `
  <div class="nearby-header" id="nearbyHeader">
    <div class="nearby-title-row">
      <h3>🔀 Trains from Nearby Stations</h3>
      <span class="nearby-count">${nearbyTrainsData.length} train${nearbyTrainsData.length !== 1 ? 's' : ''}</span>
      <button class="nearby-toggle" id="nearbyToggle" aria-expanded="true">▼</button>
    </div>
    <p class="nearby-hint">These trains depart from or arrive at nearby stations. Consider connecting transport to these stations.</p>
  </div>`;

  // Quick-search suggestions for nearby major stations with distance
  if (hasSuggs) {
    html += `<div class="nearby-suggest">
      <span class="ns-label">Nearby stations:</span>
      ${nearbyStationSuggs.map(s =>
        `<button class="ns-btn" data-name="${esc(s.name)}" title="Search from ${esc(s.name)}">
          ${esc(s.name)} <span class="ns-code">${esc(s.code)}</span>
          ${s.distance ? `<span class="ns-dist">${esc(s.distance)}</span>` : ''}
        </button>`
      ).join('')}
    </div>`;
  }

  // Nearby train cards
  if (hasNearby) {
    html += `<div class="nearby-cards" id="nearbyCards">
      ${nearbyTrainsData.map((t, i) => buildTrainCard(t, i, true)).join('')}
    </div>`;
  }

  container.innerHTML = html;

  // Toggle expand/collapse
  const toggle = $('nearbyToggle');
  const cards  = $('nearbyCards');
  if (toggle && cards) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      toggle.textContent = expanded ? '▶' : '▼';
      cards.style.display = expanded ? 'none' : 'flex';
    });
  }

  // Quick-search button handlers
  container.querySelectorAll('.ns-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fromInput.value = btn.dataset.name;
      fromCode.value = '';
      searchForm.dispatchEvent(new Event('submit'));
    });
  });
}

// ─── Availability Chips ──────────────────────────────────────────────────────
function renderClasses(train) {
  if (!train.classes || !train.classes.length) return '';

  return train.classes.map(c => {
    const badge = `b${c.cls.replace('/','')}`; // b1A, b2A, bSL, etc.
    return `
    <a href="${esc(c.link)}" target="_blank" rel="noopener" class="cls-chip">
      <div class="cls-left">
        <span class="cls-badge ${badge}">${esc(c.cls)}</span>
        <span class="cls-price">${c.price ? '₹'+c.price : '—'}</span>
      </div>
      <div class="cls-right">
        <div class="cls-avail s-${c.status}">${esc(c.avail)}</div>
        ${c.prediction ? `<div class="cls-pred">${esc(c.prediction)} Confirm</div>` : ''}
        <div class="cls-date">${fmtDate(c.date || selectedDate)}</div>
      </div>
    </a>`;
  }).join('');
}

function fmtDate(d) {
  const p = d.split('-');
  if (p.length!==3) return d;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${+p[0]} ${months[+p[1]-1]||p[1]}`;
}

function lowestPrice(t) {
  if (!t.classes || !t.classes.length) return '';
  const prices = t.classes.map(c => c.price).filter(p => p > 0);
  if (!prices.length) return '';
  return '₹' + Math.min(...prices);
}

// ─── Filters & Sort ──────────────────────────────────────────────────────────
document.querySelectorAll('.pill').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    p.classList.add('active');
    curFilter = p.dataset.f;
    renderCards(allTrains);
  });
});
sortSel.addEventListener('change', () => renderCards(allTrains));

function filterTrains(trains) {
  if (curFilter === 'avail')  return trains.filter(t => t.classes.some(c => c.status !== 'Regret'));
  return trains;
}

function sortTrains(trains) {
  const s = sortSel.value;
  return [...trains].sort((a, b) => {
    if (s === 'departure') return (a.departure||'99:99').localeCompare(b.departure||'99:99');
    if (s === 'name')      return (a.name||'').localeCompare(b.name||'');
    if (s === 'cheapest')  return minPrice(a) - minPrice(b);
    return 0;
  });
}

function minPrice(t) {
  if (!t.classes.length) return Infinity;
  const prices = t.classes.map(c=>c.price).filter(p=>p>0);
  return prices.length ? Math.min(...prices) : Infinity;
}

// ─── Util ────────────────────────────────────────────────────────────────────
function esc(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function highlight(text, q) {
  const r = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(r, '<strong style="color:var(--pri2)">$1</strong>');
}
