import { db } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── State ──
let pinLat = null;
let pinLng = null;
let marker = null;

const btn       = document.getElementById("submitBtn");
const toast     = document.getElementById("toast");
const pinStatus = document.getElementById("pinStatus");

// ── Init pin map (centres on Finland) ──
const pinMap = L.map("pin-map").setView([64.5, 26.0], 5);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '© <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
}).addTo(pinMap);

// Drop/move pin on map tap
pinMap.on("click", (e) => {
  setPin(e.latlng.lat, e.latlng.lng);
});

// ── "Use My Location" button ──
document.getElementById("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return showToast("Geolocation not supported by your browser.", "error");
  showToast("Getting your location...");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      pinMap.setView([lat, lng], 16);
      setPin(lat, lng);
    },
    () => showToast("Couldn't get your location. Try tapping the map instead.", "error"),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

// ── Google Maps link parser ──
document.getElementById("gmapsLink").addEventListener("input", (e) => {
  const coords = extractCoordsFromGmaps(e.target.value.trim());
  if (coords) {
    pinMap.setView(coords, 16);
    setPin(coords[0], coords[1]);
    showToast("📍 Location extracted from link!", "success");
  }
});

// ── Helpers ──
function setPin(lat, lng) {
  pinLat = lat;
  pinLng = lng;
  if (marker) marker.setLatLng([lat, lng]);
  else marker = L.marker([lat, lng]).addTo(pinMap);
  pinStatus.textContent = `📍 Pin set at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  pinStatus.className = "pin-status set";
}

function extractCoordsFromGmaps(url) {
  // Format 1: /@lat,lng,zoom
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  // Format 2: ?q=lat,lng
  m = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  // Format 3: /place/.../lat,lng
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  return null;
}

// ── Submit ──
btn.addEventListener("click", async () => {
  const pubName = document.getElementById("pubName").value.trim();
  const city    = document.getElementById("city").value;
  const price   = parseFloat(document.getElementById("price").value);
  const hp      = document.getElementById("hp").value;

  if (hp) return; // honeypot

  if (!pubName || pubName.length < 3) return showToast("Please enter a valid pub name.", "error");
  if (!city)                          return showToast("Please select a city.", "error");
  if (isNaN(price) || price < 1 || price > 30) return showToast("Price must be between €1 and €30.", "error");
  if (pinLat === null)                return showToast("Please pin the pub on the map first.", "error");

  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    await push(ref(db, "submissions"), {
      pubName,
      city,
      price,
      lat: pinLat,
      lng: pinLng,
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
