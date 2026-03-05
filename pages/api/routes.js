import hubs from '../../data/hubs.json';
import regions from '../../data/regions.json';

// ─── Haversine distance (km) ────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Find best hub match for an input string ──────────────────────────────
function findHub(input) {
  const q = input.trim().toUpperCase();
  // Exact code match
  const exact = hubs.find((h) => h.code === q);
  if (exact) return exact;
  // City name match (case-insensitive)
  const city = hubs.find(
    (h) =>
      h.city.toUpperCase().includes(q) ||
      q.includes(h.city.toUpperCase()) ||
      h.name.toUpperCase().includes(q)
  );
  return city || null;
}

// ─── Build closed-region set ──────────────────────────────────────────────
function getClosedRegions() {
  return new Set(
    regions
      .filter((r) => r.status === 'closed')
      .map((r) => r.id)
  );
}

// ─── Check whether a hub is in a closed region ────────────────────────────
// We do a simple bounding-box test against region polygons
function isHubBlocked(hub) {
  const blockedRegionNames = regions
    .filter((r) => r.status === 'closed')
    .map((r) => r.name.toLowerCase());

  // Match hub region name against blocked region descriptors
  const hubRegionLower = hub.region.toLowerCase();
  for (const name of blockedRegionNames) {
    if (
      name.includes(hubRegionLower) ||
      hubRegionLower.includes('middle east') && name.includes('middle east') ||
      hubRegionLower.includes('iran') && name.includes('iran') ||
      hubRegionLower.includes('ukraine') && name.includes('ukraine') ||
      hubRegionLower.includes('russia') && name.includes('russia')
    ) {
      return true;
    }
  }

  // Geo point-in-polygon (bounding box) check against closed polygons
  for (const region of regions) {
    if (region.status !== 'closed') continue;
    const poly = region.polygon;
    const lats = poly.map((p) => p[0]);
    const lons = poly.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    if (
      hub.lat >= minLat &&
      hub.lat <= maxLat &&
      hub.lon >= minLon &&
      hub.lon <= maxLon
    ) {
      return true;
    }
  }
  return false;
}

// ─── Determine transit status of a route ──────────────────────────────────
function routeTransitStatus(stops) {
  let worst = 'open';
  for (const hub of stops) {
    // Check if any stops are in limited regions
    for (const region of regions) {
      if (region.status === 'limited') {
        const poly = region.polygon;
        const lats = poly.map((p) => p[0]);
        const lons = poly.map((p) => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        if (
          hub.lat >= minLat &&
          hub.lat <= maxLat &&
          hub.lon >= minLon &&
          hub.lon <= maxLon
        ) {
          worst = 'limited';
        }
      }
    }
  }
  if (worst === 'limited') return { label: 'Limited congestion', color: 'orange' };
  return { label: 'Open', color: 'green' };
}

// ─── Score a route (lower = better) ───────────────────────────────────────
function routeScore(stops) {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversine(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon);
  }
  // Penalise detours: ratio of route distance to direct distance
  const direct = haversine(
    stops[0].lat, stops[0].lon,
    stops[stops.length - 1].lat, stops[stops.length - 1].lon
  );
  const detourRatio = total / (direct || 1);
  return total * (1 + Math.max(0, detourRatio - 1.2) * 0.5);
}

// ─── "Between-ness" check — is hub within 35% detour of direct path? ───────
function isOnPath(origin, hub, destination) {
  const direct = haversine(origin.lat, origin.lon, destination.lat, destination.lon);
  const via = haversine(origin.lat, origin.lon, hub.lat, hub.lon) +
               haversine(hub.lat, hub.lon, destination.lat, destination.lon);
  return via / (direct || 1) < 1.55;
}

// ─── Main route generation ────────────────────────────────────────────────
function generateRoutes(origin, destination) {
  const availableHubs = hubs.filter((h) => !isHubBlocked(h));

  const routes = [];

  // Same airport / hub
  if (origin.code === destination.code) {
    return [];
  }

  // Direct (no intermediates) — include if hubs are the same or very close
  const directDist = haversine(origin.lat, origin.lon, destination.lat, destination.lon);
  if (directDist < 3000) {
    routes.push({
      stops: [origin, destination],
      score: directDist,
    });
  }

  // 1-stop routes
  for (const mid of availableHubs) {
    if (mid.code === origin.code || mid.code === destination.code) continue;
    if (!isOnPath(origin, mid, destination)) continue;
    routes.push({
      stops: [origin, mid, destination],
      score: routeScore([origin, mid, destination]),
    });
  }

  // 2-stop routes
  for (const mid1 of availableHubs) {
    if (mid1.code === origin.code || mid1.code === destination.code) continue;
    const d1 = haversine(origin.lat, origin.lon, mid1.lat, mid1.lon);
    const d2 = haversine(mid1.lat, mid1.lon, destination.lat, destination.lon);
    if (d1 > directDist * 1.2) continue; // mid1 must not be farther than 120% direct

    for (const mid2 of availableHubs) {
      if (
        mid2.code === origin.code ||
        mid2.code === destination.code ||
        mid2.code === mid1.code
      ) continue;
      const via = d1 +
        haversine(mid1.lat, mid1.lon, mid2.lat, mid2.lon) +
        haversine(mid2.lat, mid2.lon, destination.lat, destination.lon);
      if (via / (directDist || 1) > 1.7) continue;

      routes.push({
        stops: [origin, mid1, mid2, destination],
        score: routeScore([origin, mid1, mid2, destination]),
      });
    }
  }

  // Deduplicate by stop signature
  const seen = new Set();
  const unique = routes.filter((r) => {
    const key = r.stops.map((s) => s.code).join('-');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by score (ascending = most efficient first)
  unique.sort((a, b) => a.score - b.score);

  // Ensure variety: prefer different intermediate hubs in top results
  const final = [];
  const usedIntermediates = new Set();

  for (const route of unique) {
    if (final.length >= 5) break;
    const intermediates = route.stops.slice(1, -1).map((s) => s.code);
    const key = intermediates[0] || 'direct';
    if (usedIntermediates.has(key)) continue;
    usedIntermediates.add(key);
    final.push(route);
  }

  // If fewer than 3, relax the uniqueness constraint
  if (final.length < 3) {
    for (const route of unique) {
      if (final.length >= 5) break;
      const key = route.stops.map((s) => s.code).join('-');
      if (!final.find((f) => f.stops.map((s) => s.code).join('-') === key)) {
        final.push(route);
      }
    }
  }

  return final.slice(0, 5).map((r, i) => {
    const totalDist = Math.round(routeScore(r.stops));
    const status = routeTransitStatus(r.stops);
    const stops = r.stops;
    const legs = [];
    for (let j = 0; j < stops.length - 1; j++) {
      legs.push({
        from: stops[j],
        to: stops[j + 1],
        distance: Math.round(haversine(stops[j].lat, stops[j].lon, stops[j + 1].lat, stops[j + 1].lon)),
      });
    }
    return {
      id: i + 1,
      stops: stops.map((s) => ({
        code: s.code,
        name: s.name,
        city: s.city,
        region: s.region,
        lat: s.lat,
        lon: s.lon,
      })),
      legs,
      totalDistance: totalDist,
      stops_count: stops.length - 2, // intermediate stops
      status,
    };
  });
}

// ─── API Handler ──────────────────────────────────────────────────────────
async function searchLegAvailability(origin, destination, date, adults) {
  // Quick availability check - import Duffel if available
  const token = process.env.DUFFEL_TOKEN;
  if (!token) return true; // Skip validation if no token
  
  try {
    const { Duffel } = await import('@duffel/api');
    const duffel = new Duffel({ token, apiVersion: process.env.DUFFEL_API_VERSION || 'v2' });
    
    const passengers = Array.from({ length: adults }, () => ({ type: 'adult' }));
    const offerRequest = await duffel.offerRequests.create({
      slices: [{ origin, destination, departure_date: date }],
      passengers,
      cabin_class: 'economy',
      return_offers: true,
    });
    
    return (offerRequest.data?.offers?.length ?? 0) > 0;
  } catch {
    return true; // If check fails, don't block the result
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to, date, adults = '1' } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing from or to parameter' });
  }

  const origin = findHub(from);
  const destination = findHub(to);

  if (!origin) {
    return res.status(404).json({ error: `Airport not found: "${from}". Try a 3-letter code like BKK or SIN.` });
  }
  if (!destination) {
    return res.status(404).json({ error: `Airport not found: "${to}". Try a 3-letter code like AMS or LHR.` });
  }
  if (origin.code === destination.code) {
    return res.status(400).json({ error: 'Origin and destination cannot be the same airport.' });
  }

  if (isHubBlocked(origin)) {
    return res.status(200).json({
      warning: `Origin hub ${origin.code} (${origin.city}) is in a restricted or closed region. Routes may be limited.`,
      origin,
      destination,
      routes: [],
    });
  }
  if (isHubBlocked(destination)) {
    return res.status(200).json({
      warning: `Destination hub ${destination.code} (${destination.city}) is in a restricted or closed region. Routes may be limited.`,
      origin,
      destination,
      routes: [],
    });
  }

  let allRoutes = generateRoutes(origin, destination);
  
  // Validate each route's availability if date is provided
  let viableRoutes = allRoutes;
  if (date) {
    const adultCount = parseInt(adults, 10) || 1;
    viableRoutes = [];
    
    for (const route of allRoutes) {
      // Check if all legs have flights
      let allLegsAvailable = true;
      for (let i = 0; i < route.stops.length - 1; i++) {
        const fromCode = route.stops[i].code;
        const toCode = route.stops[i + 1].code;
        const hasFlights = await searchLegAvailability(fromCode, toCode, date, adultCount);
        if (!hasFlights) {
          allLegsAvailable = false;
          break;
        }
      }
      
      if (allLegsAvailable) {
        viableRoutes.push(route);
      }
    }
  }

  return res.status(200).json({
    origin,
    destination,
    date,
    adults: parseInt(adults, 10),
    routes: viableRoutes,
    generated_at: new Date().toISOString(),
  });
}
