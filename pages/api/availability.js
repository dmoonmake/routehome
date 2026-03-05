/**
 * Duffel Flight Offers + Seat Maps proxy
 * Docs:
 *   Offer Requests: https://duffel.com/docs/api/v1/offer-requests
 *   Seat Maps:      https://duffel.com/docs/api/v1/seat-maps
 *
 * Required env var:
 *   DUFFEL_TOKEN — from app.duffel.com → Developers → Access tokens
 *                  Test tokens start with: duffel_test_...
 *                  Live tokens start with: duffel_live_...
 */

import { Duffel } from "@duffel/api";

// ─── Parse seat map → available & total seat counts ───────────────────────
function parseSeatMap(seatMaps) {
  let total = 0;
  let available = 0;

  for (const seatMap of seatMaps) {
    for (const cabin of seatMap.cabins ?? []) {
      for (const row of cabin.rows ?? []) {
        for (const section of row.sections ?? []) {
          for (const element of section.elements ?? []) {
            if (element.type !== "seat") continue;
            total++;
            // Duffel: if available_services is non-empty the seat can be selected
            if (element.available_services?.length > 0) available++;
          }
        }
      }
    }
  }

  return { total, available };
}

// ─── Crowding label from seat fill rate ────────────────────────────────────
function crowdingFromSeats(available, total) {
  if (total === 0) return { label: "Unknown",      color: "gray",   icon: "⚪", pct: null };
  const pct = available / total;
  if (pct > 0.5)  return { label: "Available",     color: "green",  icon: "🟢", pct };
  if (pct > 0.2)  return { label: "Filling up",    color: "orange", icon: "🟠", pct };
  if (pct > 0)    return { label: "Almost full",   color: "red",    icon: "🔴", pct };
  return                  { label: "Sold out",      color: "red",    icon: "🔴", pct: 0 };
}

// ─── Fallback crowding from offer count (if seat map unavailable) ──────────
function crowdingFromOfferCount(count) {
  if (count === 0) return { label: "No flights",   color: "gray",   icon: "⚫", pct: null };
  if (count >= 5)  return { label: "Available",    color: "green",  icon: "🟢", pct: null };
  if (count >= 2)  return { label: "Limited",      color: "orange", icon: "🟠", pct: null };
  return                  { label: "Very limited", color: "red",    icon: "🔴", pct: null };
}

function formatDuration(iso) {
  if (!iso) return null;
  return iso.replace("PT", "").replace("H", "h ").replace("M", "m").trim();
}

// ─── Search one leg + fetch seat map for each offer ───────────────────────
async function searchLeg(duffel, origin, destination, date, adults) {
  const passengers = Array.from({ length: adults }, () => ({ type: "adult" }));

  // 1. Create offer request
  const offerRequest = await duffel.offerRequests.create({
    slices: [{ origin, destination, departure_date: date }],
    passengers,
    cabin_class: "economy",
    return_offers: true,
  });

  const raw = offerRequest.data?.offers ?? [];

  // Sort cheapest first, take top 6
  const sorted = [...raw]
    .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
    .slice(0, 6);

  // 2. Fetch seat map for each offer in parallel (best effort)
  const seatMapsClient = duffel.seatMaps;
  const fetchSeatMaps =
    typeof seatMapsClient?.list === "function"
      ? seatMapsClient.list.bind(seatMapsClient)
      : typeof seatMapsClient?.get === "function"
        ? seatMapsClient.get.bind(seatMapsClient)
        : null;

  const seatMapResults = await Promise.all(
    sorted.map((offer) => {
      if (!fetchSeatMaps) return [];
      return fetchSeatMaps({ offer_id: offer.id })
        .then((res) => res.data ?? [])
        .catch(() => []); // seat maps may not be available for all flights
    })
  );

  // 3. Build flight objects with real seat data
  const flights = sorted.map((offer, idx) => {
    const slice    = offer.slices[0];
    const segs     = slice?.segments ?? [];
    const firstSeg = segs[0];
    const lastSeg  = segs[segs.length - 1];
    const stops    = segs.length - 1;
    const cabin    = firstSeg?.passengers?.[0]?.cabin_class ?? "economy";

    // Seat map data for this offer
    const maps = seatMapResults[idx];
    const { total: seatTotal, available: seatAvailable } = parseSeatMap(maps);
    const hasSeatData = seatTotal > 0;

    const crowding = hasSeatData
      ? crowdingFromSeats(seatAvailable, seatTotal)
      : crowdingFromOfferCount(sorted.length);

    return {
      id:            offer.id,
      airline:       firstSeg?.marketing_carrier?.iata_code ?? "—",
      airlineName:   firstSeg?.marketing_carrier?.name ?? "Unknown airline",
      flightNumber:  `${firstSeg?.marketing_carrier?.iata_code ?? ""}${firstSeg?.marketing_carrier_flight_number ?? ""}`,
      departure:     firstSeg?.departing_at,
      arrival:       lastSeg?.arriving_at,
      duration:      formatDuration(slice?.duration),
      stops,
      cabin:         cabin.charAt(0).toUpperCase() + cabin.slice(1),
      // Real seat counts (null if seat map not available)
      seatAvailable: hasSeatData ? seatAvailable : null,
      seatTotal:     hasSeatData ? seatTotal : null,
      hasSeatData,
      crowding,
      price: {
        total:    parseFloat(offer.total_amount),
        currency: offer.total_currency,
      },
      segments: segs.map((s) => ({
        carrier: s.marketing_carrier?.iata_code,
        number:  s.marketing_carrier_flight_number,
        from:    s.origin?.iata_code,
        to:      s.destination?.iata_code,
        departs: s.departing_at,
        arrives: s.arriving_at,
        aircraft: s.aircraft?.iata_code,
      })),
    };
  });

  return { flights, offerCount: raw.length };
}

// ─── API Handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.DUFFEL_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: "Duffel API not configured.",
      setup:
        "Add DUFFEL_TOKEN to your .env.local file. Get a free test token at https://app.duffel.com → Developers → Access tokens",
    });
  }

  const { legs, date, adults = "1" } = req.query;

  if (!legs) {
    return res.status(400).json({ error: "Missing param: legs (e.g. BKK-NRT,NRT-AMS)" });
  }

  const legPairs = legs
    .split(",")
    .map((l) => {
      const [from, to] = l.split("-");
      return { from: from?.trim(), to: to?.trim() };
    })
    .filter((l) => l.from && l.to);

  if (legPairs.length === 0) {
    return res.status(400).json({ error: "No valid legs provided" });
  }

  // Default to tomorrow
  const searchDate =
    date ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    })();

  const duffel = new Duffel({
    token,
    apiVersion: process.env.DUFFEL_API_VERSION || "v2",
  });

  try {
    const results = await Promise.all(
      legPairs.map(({ from, to }) =>
        searchLeg(duffel, from, to, searchDate, parseInt(adults, 10)).catch((err) => ({
          flights: [],
          offerCount: 0,
          error: err?.errors?.[0]?.message ?? err.message,
        }))
      )
    );

    const legs_result = legPairs.map((leg, i) => ({
      from:       leg.from,
      to:         leg.to,
      date:       searchDate,
      flights:    results[i].flights ?? [],
      offerCount: results[i].offerCount ?? 0,
      error:      results[i].error ?? null,
    }));

    // Overall crowding = worst leg (lowest seat availability %)
    let overallCrowding;
    const legsWithData = legs_result.filter(
      (l) => l.flights.length > 0 && l.flights[0]?.hasSeatData
    );

    if (legsWithData.length > 0) {
      // Use worst seat fill rate across all legs
      let worstPct = Infinity;
      let worstAvail = Infinity, worstTotal = 0;
      for (const leg of legs_result) {
        const topFlight = leg.flights[0];
        if (topFlight?.hasSeatData) {
          const pct = topFlight.seatAvailable / topFlight.seatTotal;
          if (pct < worstPct) {
            worstPct   = pct;
            worstAvail = topFlight.seatAvailable;
            worstTotal = topFlight.seatTotal;
          }
        }
      }
      overallCrowding = worstTotal > 0
        ? crowdingFromSeats(worstAvail, worstTotal)
        : crowdingFromOfferCount(Math.min(...legs_result.map((l) => l.offerCount)));
    } else {
      overallCrowding = crowdingFromOfferCount(
        Math.min(...legs_result.map((l) => l.offerCount))
      );
    }

    return res.status(200).json({
      legs: legs_result,
      date: searchDate,
      overallCrowding,
      source: "Duffel Flight Offers + Seat Maps API v2",
      note: token.startsWith("duffel_test_")
        ? "Test environment — seat map data is simulated, not real inventory"
        : null,
    });
  } catch (err) {
    console.error("[availability/duffel]", err);
    return res.status(500).json({
      error: err?.errors?.[0]?.message ?? err.message ?? "Unexpected error",
    });
  }
}
