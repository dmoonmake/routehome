import { useEffect, useRef, useState } from 'react';

// This component is loaded dynamically (no SSR) from the parent
export default function AirspaceMap({ routeResult }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayerRef = useRef(null);
  const [regions, setRegions] = useState([]);
  const [activeRegion, setActiveRegion] = useState(null);

  // Load regions data
  useEffect(() => {
    fetch('/api/regions')
      .then((r) => r.json())
      .then((d) => setRegions(d.regions || []));
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [20, 20],
      zoom: 2,
      minZoom: 2,
      maxZoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile layer — CartoDB Positron (clean, light)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd',
    }).addTo(map);

    // Custom zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Attribution
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© OpenStreetMap · © CARTO · RouteHome')
      .addTo(map);

    mapInstance.current = map;
  }, []);

  // Draw region polygons
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current || regions.length === 0) return;

    const map = mapInstance.current;

    const colorMap = {
      open:    { fill: '#22c55e', stroke: '#16a34a' },
      limited: { fill: '#f97316', stroke: '#ea580c' },
      closed:  { fill: '#ef4444', stroke: '#dc2626' },
    };

    regions.forEach((region) => {
      const colors = colorMap[region.status] || colorMap.open;
      const latlngs = region.polygon.map((p) => [p[0], p[1]]);

      const poly = L.polygon(latlngs, {
        color: colors.stroke,
        fillColor: colors.fill,
        fillOpacity: 0.18,
        weight: 1.5,
        opacity: 0.7,
        dashArray: region.status === 'closed' ? '6 4' : null,
      }).addTo(map);

      poly.bindTooltip(
        `<div style="font-family:Inter,sans-serif;padding:4px 2px">
          <strong style="font-size:12px">${region.name}</strong><br/>
          <span style="font-size:11px;color:${colors.fill}">${region.statusLabel}</span><br/>
          <span style="font-size:10px;color:#666">${region.note}</span>
        </div>`,
        { sticky: true, className: 'route-tooltip' }
      );
    });
  }, [regions]);

  // Draw route on map when result changes
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current) return;

    const map = mapInstance.current;

    // Remove previous route layer
    if (routeLayerRef.current) {
      routeLayerRef.current.forEach((l) => map.removeLayer(l));
      routeLayerRef.current = null;
    }

    if (!routeResult || !routeResult.routes || routeResult.routes.length === 0) return;

    const layers = [];
    const bestRoute = routeResult.routes[0];
    const allPoints = [];

    // Draw best route polyline
    const coords = bestRoute.stops.map((s) => [s.lat, s.lon]);
    allPoints.push(...coords);

    const line = L.polyline(coords, {
      color: '#2563eb',
      weight: 3,
      opacity: 0.85,
      dashArray: '8 4',
    }).addTo(map);
    layers.push(line);

    // Draw markers for each stop
    bestRoute.stops.forEach((stop, idx) => {
      const isOrigin = idx === 0;
      const isDest = idx === bestRoute.stops.length - 1;
      const isIntermediate = !isOrigin && !isDest;

      const markerColor = isOrigin ? '#2563eb' : isDest ? '#dc2626' : '#7c3aed';
      const markerSize  = isOrigin || isDest ? 14 : 10;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${markerSize}px;height:${markerSize}px;
          background:${markerColor};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ${isIntermediate ? 'opacity:0.9' : ''}
        "></div>`,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([stop.lat, stop.lon], { icon })
        .addTo(map)
        .bindTooltip(
          `<div style="font-family:Inter,sans-serif;padding:2px">
            <strong style="font-size:12px">${stop.code}</strong> — ${stop.city}<br/>
            <span style="font-size:10px;color:#666">${stop.name}</span>
          </div>`,
          { permanent: false, direction: 'top', offset: [0, -8] }
        );
      layers.push(marker);
    });

    routeLayerRef.current = layers;

    // Fit map to route bounds
    if (allPoints.length > 1) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 5 });
    }
  }, [routeResult]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden relative">
      {/* Map header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5 py-3 bg-white/90 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
          <span className="text-sm font-semibold text-slate-800">Global Airspace Status</span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3">
          {[
            { color: 'bg-emerald-500', label: 'Open' },
            { color: 'bg-amber-500',   label: 'Limited' },
            { color: 'bg-red-500',     label: 'Closed' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${color} opacity-70`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
          {routeResult?.routes?.length > 0 && (
            <>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="text-blue-600">&#8212;&#8212;</span>
                <span className="text-xs text-slate-500">Best route</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Leaflet container */}
      <div ref={mapRef} style={{ height: '420px', width: '100%' }} className="mt-0" />

      {/* Tooltip style injection */}
      <style>{`
        .route-tooltip { background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 6px 10px; }
        .route-tooltip::before { display:none; }
        .leaflet-container { background: #f8fafc; }
      `}</style>
    </div>
  );
}
