# ✈️ RouteHome — Alternate Flight Route Finder

RouteHome helps travelers find possible flight routes when major airspace closures disrupt normal travel. It suggests routing paths via major global hub airports and shows **live flight availability and pricing** via the Duffel API.

> **This tool does NOT book flights.** It only suggests informational routing paths. Always verify with airlines.

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Free Duffel test token ([app.duffel.com](https://app.duffel.com))

### Steps

```bash
# 1. Go into the project folder
cd routehome

# 2. Install dependencies (includes @duffel/api)
npm install

# 3. Set up your Duffel token
cp .env.local.example .env.local
# → Open .env.local and paste your DUFFEL_TOKEN

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Without a Duffel token:** RouteHome still works fully for route finding and the map. The "Check Availability" button will show a setup message with a link to get your free token.

---

## 🔑 Getting a Free Duffel Token

1. Go to [app.duffel.com](https://app.duffel.com) and sign up (no credit card needed)
2. Verify your email
3. In the left sidebar go to **Developers → Access tokens**
4. Click **Create a token** → name it anything (e.g. "RouteHome")
5. Copy the token — it starts with `duffel_test_...`
6. Paste it into `.env.local` as `DUFFEL_TOKEN=duffel_test_...`
7. Restart the dev server

Test tokens are **free forever**. When you want real live inventory, apply for a live token in your Duffel dashboard.

---

## 📁 Project Structure

```
routehome/
├── pages/
│   ├── _app.js                  # App wrapper
│   ├── index.js                 # Main page layout
│   └── api/
│       ├── routes.js            # Route generation algorithm
│       ├── availability.js      # Duffel Flight Offers proxy
│       ├── updates.js           # Aviation updates feed
│       └── regions.js           # Airspace regions
├── components/
│   ├── RouteForm.js             # Search form with quick examples
│   ├── RouteResults.js          # Route cards + Check Availability buttons
│   ├── FlightAvailability.js    # Expandable live availability panel
│   ├── AirspaceMap.js           # Leaflet interactive map
│   └── UpdatesPanel.js          # Disruption feed
├── data/
│   ├── hubs.json                # 58 global hub airports with coordinates
│   ├── regions.json             # Airspace regions with status + polygons
│   └── updates.json             # Aviation disruption updates
├── .env.local.example           # ← Copy this to .env.local and add your token
├── package.json
└── ...
```

---

## ✈️ How Availability Works

When you click **"Check Availability"** on any suggested route:

1. Pick a travel date and number of passengers
2. RouteHome calls `/api/availability` — server-side, so your token stays secret
3. For each leg of the route, it creates a Duffel Offer Request and retrieves available flights
4. Results show per leg:
   - Flight options sorted by price (cheapest first)
   - Departure / arrival times and duration
   - Airline, flight number, cabin class, number of stops
   - Availability indicator: 🟢 Available · 🟠 Limited · 🔴 Very limited
   - Price per person
5. An **overall crowding badge** summarises the worst leg across the full route

---

## 🗺️ Route Generation Algorithm

1. Match input to hub airport code or city name (`data/hubs.json`)
2. Filter out hubs inside closed airspace regions (bounding-box geo test)
3. Generate 1-stop and 2-stop paths via intermediate hubs
4. Score by Haversine great-circle distance + detour ratio penalty
5. Deduplicate to ensure varied intermediate hub choices
6. Return top 5 routes sorted by efficiency

---

## 🛠️ Customization

| File | What to change |
|---|---|
| `data/hubs.json` | Add / remove airports |
| `data/regions.json` | Update airspace status (`open` / `limited` / `closed`) |
| `data/updates.json` | Update the disruption news feed |
| `pages/api/availability.js` | Swap to a different flight API |

---

## 📋 Disclaimer

> This tool provides **informational routing suggestions only**. Availability data is sourced from Duffel and may not reflect real-time airline inventory. Always verify routes and ticket availability with airlines and official aviation authorities before travel.

---

*Built with Next.js · TailwindCSS · Leaflet.js · Duffel API*
# routehome
