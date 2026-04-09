import { db } from "./firebase.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── City coordinates for map pins ──
const CITY_COORDS = {
  Helsinki:    [60.1699, 24.9384],
  Espoo:       [60.2052, 24.6559],
  Tampere:     [61.4978, 23.7610],
  Turku:       [60.4518, 22.2666],
  Oulu:        [65.0121, 25.4651],
  Jyväskylä:  [62.2426, 25.7473],
  Lahti:       [60.9827, 25.6612],
  Kuopio:      [62.8924, 27.6770],
  Pori:        [51.4088, 21.7833],
  Rovaniemi:   [66.5039, 25.7294],
  Other:       [64.9600, 27.5900],
};

const STALE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function pinColor(price, stale) {
  if (stale)       return "#666";
  if (price < 8)   return "#2ecc71";
  if (price <= 10) return "#f5a623";
  return "#e74c3c";
}

function priceColor(price) {
  if (price < 8)   return "var(--green)";
  if (price <= 10) return "var(--gold)";
  return "var(--red)";
}

// ── Marker store (key = pubName__city) ──
const markerStore = {};
const map = L.map("map").setView([64.5, 26.0], 5);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '© <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
}).addTo(map);

// ── Load data ──
const submissionsRef = ref(db, "submissions");
onValue(submissionsRef, (snapshot) => {
  const raw = snapshot.val() || {};
  const submissions = Object.values(raw);
  if (!submissions.length) {
    document.getElementById("leaderboard").innerHTML = `<div class="loading">No submissions yet — be the first! 🍺</div>`;
    return;
  }
  const pubMap = buildPubMap(submissions);
  renderMap(pubMap);
  renderStats(pubMap);
  renderLeaderboard(pubMap);
  renderCityAverages(pubMap);
  renderRecent(submissions);
});

// ── Group submissions by pub name (latest price per pub) ──
function buildPubMap(submissions) {
  const pubs = {};
  submissions.forEach(s => {
    const key = `${s.pubName}__${s.city}`;
    if (!pubs[key] || s.timestamp > pubs[key].timestamp) {
      pubs[key] = { ...s, count: (pubs[key]?.count || 0) + 1 };
    } else {
      pubs[key].count = (pubs[key].count || 0) + 1;
    }
  });
  return Object.values(pubs);
}

// ── Map pins ──
function renderMap(pubs) {
  pubs.forEach(pub => {
    // Use exact coords if available, fall back to city centre + jitter
    const jitter = () => (Math.random() - 0.5) * 0.06;
    const fallback = CITY_COORDS[pub.city] || CITY_COORDS["Other"];
    const pos = (pub.lat && pub.lng)
      ? [pub.lat, pub.lng]
      : [fallback[0] + jitter(), fallback[1] + jitter()];
    const stale = Date.now() - pub.timestamp > STALE_MS;

    const m = L.circleMarker(pos, {
      radius: 9,
              fillColor: pinColor(pub.price, stale),
      color: "#0d0d0d",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map);

    m.bindPopup(`
      <div class="popup-pub">${pub.pubName}${stale ? '<span class="stale-badge">OLD</span>' : ''}</div>
      <div class="popup-city">${pub.city}</div>
      <div class="popup-price">€${pub.price.toFixed(2)}</div>
      <div class="popup-meta">Based on ${pub.count} report${pub.count > 1 ? "s" : ""} · Added by ${pub.submittedBy || "Anonymous"}</div>
    `);

    markerStore[`${pub.pubName}__${pub.city}`] = m;
  });
}

// ── Top stats ──
function renderStats(pubs) {
  const prices = pubs.map(p => p.price);
  const cheapest = pubs.reduce((a, b) => a.price < b.price ? a : b);
  const expensive = pubs.reduce((a, b) => a.price > b.price ? a : b);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  document.getElementById("stat-cheapest").textContent = `€${cheapest.price.toFixed(2)}`;
  document.getElementById("stat-cheapest-pub").textContent = cheapest.pubName;
  document.getElementById("stat-expensive").textContent = `€${expensive.price.toFixed(2)}`;
  document.getElementById("stat-expensive-pub").textContent = expensive.pubName;
  document.getElementById("stat-avg").textContent = `€${avg.toFixed(2)}`;
  document.getElementById("stat-count").textContent = pubs.length;
}

// ── Fly to marker ──
function flyToMarker(pubName, city) {
  const m = markerStore[`${pubName}__${city}`];
  if (!m) return;
  map.flyTo(m.getLatLng(), 15, { duration: 1 });
  setTimeout(() => m.openPopup(), 1000);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Leaderboard ──
function renderLeaderboard(pubs) {
  const sorted = [...pubs].sort((a, b) => a.price - b.price).slice(0, 8);
  const el = document.getElementById("leaderboard");
  el.innerHTML = `
    <div class="leaderboard-header">
      <span>Pub</span><span>Price</span>
    </div>
    ${sorted.map((p, i) => `
      <div class="leaderboard-row" onclick="flyToMarker('${p.pubName.replace(/'/g, "\\'")}', '${p.city}')" style="cursor:pointer">
        <div class="rank">${i + 1}</div>
        <div class="pub-info">
          <div class="pub-name">${p.pubName}</div>
          <div class="pub-city">${p.city}</div>
        </div>
        <div class="price" style="color:${priceColor(p.price)}">€${p.price.toFixed(2)}</div>
      </div>
    `).join("")}
  `;
}

// ── City averages ──
function renderCityAverages(pubs) {
  const cityData = {};
  pubs.forEach(p => {
    if (!cityData[p.city]) cityData[p.city] = [];
    cityData[p.city].push(p.price);
  });

  const averages = Object.entries(cityData)
    .map(([city, prices]) => ({ city, avg: prices.reduce((a, b) => a + b, 0) / prices.length }))
    .sort((a, b) => a.avg - b.avg);

  document.getElementById("city-averages").innerHTML = averages.map(c => `
    <div class="city-card">
      <span class="city-name">${c.city}</span>
      <span class="city-avg">€${c.avg.toFixed(2)}</span>
    </div>
  `).join("");
}

// ── Recent submissions ──
function renderRecent(submissions) {
  const sorted = [...submissions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  document.getElementById("recent-list").innerHTML = sorted.map(s => `
    <div class="recent-card" onclick="flyToMarker('${s.pubName.replace(/'/g, "\\'")}', '${s.city}')" style="cursor:pointer">
      <div>
        <div class="r-pub">${s.pubName}</div>
        <div class="r-city">${s.city} · ${s.submittedBy || "Anonymous"}</div>
      </div>
      <div style="text-align:right">
        <div class="r-price" style="color:${priceColor(s.price)}">€${s.price.toFixed(2)}</div>
        <div class="r-time">${timeAgo(s.timestamp)}</div>
      </div>
    </div>
  `).join("");
}

// ── Expose flyToMarker globally (required for inline onclick handlers) ──
window.flyToMarker = flyToMarker;

// ── Helpers ──
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
