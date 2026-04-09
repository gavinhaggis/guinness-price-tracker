import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCW9FdNJv96wlB1Y2nK6is32cFk3q6ItV4",
  authDomain:        "guinness-price-tracker.firebaseapp.com",
  databaseURL:       "https://guinness-price-tracker-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "guinness-price-tracker",
  storageBucket:     "guinness-price-tracker.firebasestorage.app",
  messagingSenderId: "915817237971",
  appId:             "1:915817237971:web:8ec88f129dc977a0ef7326"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
