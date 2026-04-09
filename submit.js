import { db } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const btn    = document.getElementById("submitBtn");
const toast  = document.getElementById("toast");

btn.addEventListener("click", async () => {
  const pubName = document.getElementById("pubName").value.trim();
  const city    = document.getElementById("city").value;
  const price   = parseFloat(document.getElementById("price").value);
  const hp      = document.getElementById("hp").value; // honeypot

  // ── Honeypot check ──
  if (hp) return; // bot filled the hidden field, silently drop

  // ── Client-side validation ──
  if (!pubName || pubName.length < 3) return showToast("Please enter a valid pub name.", "error");
  if (!city) return showToast("Please select a city.", "error");
  if (isNaN(price) || price < 1 || price > 30) return showToast("Price must be between €1 and €30.", "error");

  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    await push(ref(db, "submissions"), {
      pubName,
      city,
      price,
      timestamp: Date.now(),
    });

    showToast("🍺 Pint submitted! Sláinte!", "success");
    document.getElementById("pubName").value = "";
    document.getElementById("city").value = "";
    document.getElementById("price").value = "";

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
