import { useState } from 'react';

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price.total);
}

const CROWDING_CONFIG = {
  green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500', badgeBg: 'bg-emerald-100' },
  orange: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   bar: 'bg-amber-500',   badgeBg: 'bg-amber-100'   },
  red:    { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     bar: 'bg-red-500',     badgeBg: 'bg-red-100'     },
  gray:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-600',   bar: 'bg-slate-400',   badgeBg: 'bg-slate-100'   },
};

// ─── Seat Fill Bar ─────────────────────────────────────────────────────────
// Shows real seat availability % when hasSeatData=true, fallback bar otherwise
function SeatFillBar({ flight }) {
  const cfg = CROWDING_CONFIG[flight.crowding?.color] || CROWDING_CONFIG.gray;

  if (flight.hasSeatData && flight.seatTotal > 0) {
    const available = flight.seatAvailable;
    const total     = flight.seatTotal;
    const takenPct  = Math.round(((total - available) / total) * 100);
    const freePct   = 100 - takenPct;

    return (
      <div>
        {/* Stacked bar: taken (gray) + available (colored) */}
        <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 gap-px">
          <div
            className="h-full bg-slate-300 transition-all"
            style={{ width: `${takenPct}%` }}
            title={`${total - available} seats taken`}
          />
          <div
            className={`h-full ${cfg.bar} transition-all`}
            style={{ width: `${freePct}%` }}
            title={`${available} seats available`}
          />
        </div>
        {/* Labels */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-400">
            <span className={`font-semibold ${cfg.text}`}>{available}</span>
            {' '}of {total} seats free ({freePct}% available)
          </span>
          <span className={`text-xs font-bold ${cfg.text}`}>
            {flight.crowding.icon} {flight.crowding.label}
          </span>
        </div>
      </div>
    );
  }

  // Fallback: no seat map — show crowding from offer count
  const widthMap = { green: '80%', orange: '40%', red: '15%', gray: '5%' };
  const width = widthMap[flight.crowding?.color] || '5%';
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-200">
        <div className={`h-full ${cfg.bar} transition-all`} style={{ width }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-slate-400 italic">Seat map not available for this flight</span>
        <span className={`text-xs font-bold ${cfg.text}`}>
          {flight.crowding.icon} {flight.crowding.label}
        </span>
      </div>
    </div>
  );
}

// ─── Flight card ───────────────────────────────────────────────────────────
function FlightCard({ flight }) {
  const cfg = CROWDING_CONFIG[flight.crowding?.color] || CROWDING_CONFIG.gray;

  return (
    <div className={`rounded-xl border p-3.5 ${cfg.border} ${cfg.bg}`}>
      <div className="flex items-center justify-between gap-3 mb-3">

        {/* Airline + flight number */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-xs font-bold text-slate-700">{flight.airline}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {flight.flightNumber}
              {flight.airlineName && flight.airlineName !== 'Unknown airline' && (
                <span className="font-normal text-slate-500 ml-1">· {flight.airlineName}</span>
              )}
            </p>
            <p className="text-xs text-slate-400">
              {flight.cabin}
              {flight.stops > 0
                ? ` · ${flight.stops} stop${flight.stops > 1 ? 's' : ''}`
                : ' · Nonstop'}
            </p>
          </div>
        </div>

        {/* Times */}
        <div className="flex items-center gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-slate-800">{formatTime(flight.departure)}</p>
            <p className="text-xs text-slate-400">{formatDate(flight.departure)}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-1">
            <span className="text-xs text-slate-400 whitespace-nowrap">{flight.duration || '—'}</span>
            <div className="flex items-center gap-0.5">
              <div className="w-8 h-px bg-slate-300" />
              <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011 2a1.5 1.5 0 00-1.5 1.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"/>
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{formatTime(flight.arrival)}</p>
            <p className="text-xs text-slate-400">{formatDate(flight.arrival)}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-lg font-bold text-slate-800">{formatPrice(flight.price)}</span>
          <span className="text-xs text-slate-400">per person</span>
        </div>
      </div>

      {/* ── Seat fill bar (the key feature) ── */}
      <div className="pt-2.5 border-t border-white/70">
        <p className="text-xs text-slate-500 font-medium mb-1.5">Seat availability</p>
        <SeatFillBar flight={flight} />
      </div>
    </div>
  );
}

// ─── Leg panel ─────────────────────────────────────────────────────────────
function LegPanel({ leg, legIndex, totalLegs }) {
  const hasFlights = leg.flights && leg.flights.length > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
          {legIndex + 1}
        </div>
        <h4 className="text-sm font-semibold text-slate-700">
          {leg.from} → {leg.to}
        </h4>
        <span className="text-xs text-slate-400">{leg.date}</span>
        {totalLegs > 1 && (
          <span className="text-xs text-slate-400 ml-auto">
            Leg {legIndex + 1} of {totalLegs}
          </span>
        )}
      </div>

      {leg.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
          ⚠️ Could not load: {leg.error}
        </div>
      )}

      {!leg.error && !hasFlights && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
          <p className="text-slate-500 text-sm font-medium">No flights found</p>
          <p className="text-slate-400 text-xs mt-0.5">
            This route may not be served on the selected date, or Duffel sandbox has no data for this pair.
          </p>
        </div>
      )}

      {hasFlights && (
        <div className="space-y-2.5">
          {leg.flights.map((flight) => (
            <FlightCard key={flight.id} flight={flight} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function FlightAvailability({ route, onClose }) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [adults, setAdults]     = useState(1);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [searched, setSearched] = useState(false);

  const stops = route.stops;
  const legParam = stops
    .slice(0, -1)
    .map((s, i) => `${s.code}-${stops[i + 1].code}`)
    .join(',');

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setSearched(true);
    try {
      const res  = await fetch(
        `/api/availability?legs=${encodeURIComponent(legParam)}&date=${date}&adults=${adults}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.setup ? `${json.error} — ${json.setup}` : (json.error || 'Unknown error'));
      } else {
        setData(json);
      }
    } catch {
      setError('Network error. Is the dev server running?');
    } finally {
      setLoading(false);
    }
  };

  const crowdingCfg = data?.overallCrowding
    ? CROWDING_CONFIG[data.overallCrowding.color] || CROWDING_CONFIG.gray
    : null;

  return (
    <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/40 overflow-hidden">

      {/* Panel header */}
      <div className="px-5 py-4 bg-white border-b border-blue-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Live Seat Availability</p>
            <p className="text-xs text-slate-400">
              {stops.map(s => s.code).join(' → ')} · via Duffel
            </p>
          </div>
        </div>

        {/* Overall crowding badge */}
        {data?.overallCrowding && crowdingCfg && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${crowdingCfg.badgeBg} ${crowdingCfg.text} border ${crowdingCfg.border}`}>
            {data.overallCrowding.icon} {data.overallCrowding.label} overall
            {data.overallCrowding.pct !== null && (
              <span className="opacity-70">· {Math.round(data.overallCrowding.pct * 100)}% free</span>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition ml-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search controls */}
      <div className="px-5 py-3 bg-white border-b border-blue-100 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Travel Date
          </label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Passengers
          </label>
          <select
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {[1, 2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchAvailability}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Checking seats…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Check Seats
            </>
          )}
        </button>
        {data?.note && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {data.note}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="p-5">

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-red-700 text-sm font-semibold mb-1">⚠️ Could not load availability</p>
            <p className="text-red-600 text-xs leading-relaxed">{error}</p>
            {error.includes('app.duffel.com') && (
              <a href="https://app.duffel.com" target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-semibold text-blue-600 hover:underline">
                → Get free Duffel token
              </a>
            )}
          </div>
        )}

        {/* Pre-search empty state */}
        {!searched && !loading && !error && (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              {/* Seat icon */}
              <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
              </svg>
            </div>
            <p className="text-slate-600 text-sm font-medium">Pick a date and check seats</p>
            <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
              We'll pull real seat maps for each leg so you can see exactly how full each flight is
            </p>
          </div>
        )}

        {/* Leg results */}
        {data && data.legs && (
          <div className="space-y-6">
            {data.legs.map((leg, i) => (
              <LegPanel key={i} leg={leg} legIndex={i} totalLegs={data.legs.length} />
            ))}

            {/* Legend */}
            <div className="pt-4 border-t border-blue-100 space-y-1.5">
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                  Available (&gt;50% free)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                  Filling up (20–50% free)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
                  Almost full (&lt;20% free)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Source: {data.source} · RouteHome does not sell tickets — book directly with the airline.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
