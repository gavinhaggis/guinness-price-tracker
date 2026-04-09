# 🍺 Guinness Price Tracker — Finland

> *Because a good pint shouldn't cost a surprise.*

A community-driven map for tracking the price of a pint of Guinness in pubs across Finland. Submit prices, explore the map, and find the best value stout near you.

---

## 🗺️ Live Site

**[View the tracker →](https://gavinhaggis.github.io/guinness-price-tracker/index.html)**

---

## ✨ Features

- 📍 **Interactive map** — pin-accurate pub locations across Finland
- 💶 **Price submissions** — submit a pint price with your name for credit
- 📊 **Live statistics** — cheapest pint, most expensive, city averages
- 🏆 **Leaderboard** — ranked list of the best value Guinness in the country
- 🕐 **Recent submissions** — see what's been added lately
- ⚠️ **Stale data warnings** — pins older than 90 days are flagged automatically
- 📱 **Mobile first** — designed to work perfectly on your phone
- 🌐 **Embeddable map** — a standalone `map.html` you can iframe into any website

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Hosting | GitHub Pages (free) |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Map | [Leaflet.js](https://leafletjs.com/) |
| Database | Firebase Realtime Database (free Spark plan) |
| Tiles | CartoDB Dark Matter |

No build tools. No npm. No frameworks. Just files you can read and edit directly.

---

## 📁 Project Structure

```
guinness-price-tracker/
├── index.html      # Main page — map + stats + leaderboard
├── submit.html     # Submission form
├── map.html        # Embeddable map-only view
├── style.css       # All styles
├── app.js          # Map rendering, stats, Firebase reads
├── submit.js       # Form logic, geolocation, Firebase writes
└── firebase.js     # Firebase config & DB initialisation
```

---

## 🚀 Running Locally

No server needed. Just clone and open:

```bash
git clone https://gavinhaggis.github.io/guinness-price-tracker/index.html.git
cd guinness-price-tracker
open index.html
```

> Note: Firebase will still read/write to the live database unless you set up a separate dev project.

---

## 🔒 Spam Protection

Submissions are protected by two layers:

- **Honeypot field** — a hidden form field invisible to humans; bots that fill it in are silently rejected
- **Firebase security rules** — server-side validation rejects any submission with missing fields, non-string names, or prices outside the €1–€30 range

---

## 🗺️ Embedding the Map

Want to show the map on your own website? Drop this anywhere in your HTML:

```html
<iframe
  src="https://gavinhaggis.github.io/guinness-price-tracker/map.html"
  width="100%"
  height="500"
  style="border:none; border-radius:12px;"
  loading="lazy"
  title="Guinness Price Map Finland">
</iframe>
```

---

## 🤝 Contributing

Spot a bug or have an idea? Open an issue or submit a pull request — all contributions welcome.

To submit a pint price, just use the live site. No account needed. 🍺

---

## 📜 License

MIT — do whatever you like with it.

---

*Made with 🍺 and mild frustration at Helsinki pint prices.*
