import { db } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── State ──
let pinLat       = null;
let pinLng       = null;
let marker       = null;
let pubFromOSM   = false; // true when a pub was selected from OSM results
let debounceTimer = null;

const btn         = document.getElementById("submitBtn");
const toast       = document.getElementById("toast");
const pinStatus   = document.getElementById("pinStatus");
const pubInput    = document.getElementById("pubName");
const suggestions = document.getElementById("pubSuggestions");
const searchStatus = document.getElementById("pubSearchStatus");

// ── Init pin map ──
const pinMap = L.map("pin-map").setView([64.5, 26.0], 5);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '© <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
}).addTo(pinMap);

pinMap.on("click", (e) => {
  setPin(e.latlng.lat, e.latlng.lng);
  pubFromOSM = false;
});

// ── Geolocation button ──
document.getElementById("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return showToast("Geolocation not supported.", "error");
  showToast("Getting your location...");
  navigator.geolocation.getCurrentPosition(
    ({ coords: { latitude: lat, longitude: lng } }) => {
      pinMap.setView([lat, lng], 16);
      setPin(lat, lng);
      pubFromOSM = false;
    },
    () => showToast("Couldn't get location. Tap the map instead.", "error"),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

// ── Google Maps link parser ──
document.getElementById("gmapsLink").addEventListener("input", (e) => {
  const coords = extractCoordsFromGmaps(e.target.value.trim());
  if (coords) {
    pinMap.setView(coords, 16);
    setPin(coords[0], coords[1]);
    pubFromOSM = false;
    showToast("📍 Location extracted from link!", "success");
  }
});

// ── OSM Pub Autocomplete ──
pubInput.addEventListener("input", () => {
  const q = pubInput.value.trim();
  pubFromOSM = false;

  clearTimeout(debounceTimer);
  closeSuggestions();

  if (q.length < 3) {
    searchStatus.textContent = "";
    return;
  }

  searchStatus.textContent = "Searching pubs...";
  debounceTimer = setTimeout(() => searchOSM(q), 400);
});

// Close suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest("#pubSuggestions") && e.target !== pubInput) closeSuggestions();
});

// Keyboard navigation
pubInput.addEventListener("keydown", (e) => {
  const items = suggestions.querySelectorAll(".suggestion-item");
  const active = suggestions.querySelector(".suggestion-item.active");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const next = active ? active.nextElementSibling : items[0];
    if (next) { active?.classList.remove("active"); next.classList.add("active"); }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    const prev = active?.previousElementSibling;
    if (prev) { active.classList.remove("active"); prev.classList.add("active"); }
  } else if (e.key === "Enter" && active) {
    e.preventDefault();
    active.click();
  } else if (e.key === "Escape") {
    closeSuggestions();
  }
});

async function searchOSM(query) {
  const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
    q: query,
    countrycodes: "fi",
    featuretype: "amenity",
    amenity: "pub",
    format: "jsonv2",
    addressdetails: 1,
    limit: 8,
  });

  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });

    if (!res.ok) throw new Error("Nominatim error");
    const results = await res.json();

    // Filter to pubs and bars only
    const pubs = results.filter(r =>
      r.type === "pub" || r.type === "bar" || r.category === "amenity"
    );

    if (!pubs.length) {
      searchStatus.textContent = "No matching pubs found — you can still enter manually.";
      return;
    }

    searchStatus.textContent = `${pubs.length} pub${pubs.length > 1 ? "s" : ""} found`;
    renderSuggestions(pubs);

  } catch {
    searchStatus.textContent = "Search unavailable — enter pub name manually.";
  }
}

function renderSuggestions(results) {
  suggestions.innerHTML = "";
  results.forEach(place => {
    const name    = place.name || place.display_name.split(",")[0];
    const city    = place.address?.city
                 || place.address?.town
                 || place.address?.municipality
                 || place.address?.village
                 || "";
    const street  = place.address?.road || "";
    const address = [street, city].filter(Boolean).join(", ") || "Finland";
    const lat     = parseFloat(place.lat);
    const lng     = parseFloat(place.lon);

    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.innerHTML = `
      <div class="suggestion-name">${name}</div>
      <div class="suggestion-address">${address}</div>
    `;
    item.addEventListener("click", () => selectPub(name, city, lat, lng));
    suggestions.appendChild(item);
  });
}

function selectPub(name, city, lat, lng) {
  pubInput.value = name;
  pubFromOSM = true;
  closeSuggestions();
  searchStatus.textContent = "✅ Pub selected from OpenStreetMap";

  // Auto-fill city dropdown if we have a match
  if (city) {
    const select = document.getElementById("city");
    const opt = [...select.options].find(o => o.value.toLowerCase() === city.toLowerCase());
    if (opt) select.value = opt.value;
  }

  // Auto-place pin
  if (lat && lng) {
    pinMap.setView([lat, lng], 16);
    setPin(lat, lng);
  }
}

function closeSuggestions() {
  suggestions.innerHTML = "";
}

// ── Helpers ──
function setPin(lat, lng) {
  pinLat = lat; pinLng = lng;
  if (marker) marker.setLatLng([lat, lng]);
  else marker = L.marker([lat, lng]).addTo(pinMap);
  pinStatus.textContent = `📍 Pin set at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  pinStatus.className = "pin-status set";
}

function extractCoordsFromGmaps(url) {
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  m = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  return null;
}

// ── Submit ──
btn.addEventListener("click", async () => {
  const submitterName = document.getElementById("submitterName").value.trim();
  const pubName = pubInput.value.trim();
  const city    = document.getElementById("city").value;
  const price   = parseFloat(document.getElementById("price").value);
  const hp      = document.getElementById("hp").value;

  if (hp)                              return;
  if (!pubName || pubName.length < 3)  return showToast("Please enter a valid pub name.", "error");
  if (!city)                           return showToast("Please select a city.", "error");
  if (isNaN(price) || price < 1 || price > 30) return showToast("Price must be between €1 and €30.", "error");
  if (pinLat === null)                 return showToast("Please pin the pub on the map first.", "error");

  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    await push(ref(db, "submissions"), {
      pubName,
      city,
      price,
      lat: pinLat,
      lng: pinLng,
      submittedBy: submitterName || "Anonymous",
      verifiedOSM: pubFromOSM, // flag whether pub was validated against OSM
      timestamp: Date.now(),
    });

    showToast("🍺 Pint submitted! Sláinte!", "success");
    setTimeout(() => { window.location.href = "index.html"; }, 1800);

  } catch (err) {
    console.error(err);
    showToast("Something went wrong. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit Price";
  }
});

function showToast(msg, type = "") {
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = "toast"; }, 3000);
}
