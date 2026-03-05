import { useState } from 'react';
import dynamic from 'next/dynamic';

const FlightAvailability = dynamic(() => import('./FlightAvailability'), { ssr: false });

export default function RouteResults({ result, error, loading }) {
  const [openRouteId, setOpenRouteId] = useState(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full bg-blue-200 animate-pulse" />
          <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="mb-3 rounded-xl border border-slate-100 p-4 animate-pulse">
            <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-700 text-sm">Route search failed</p>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">Enter your origin and destination above</p>
        <p className="text-slate-400 text-sm mt-1">We'll suggest alternate routing paths through safe hub airports</p>
      </div>
    );
  }

  const { routes, origin, destination, warning, date, adults } = result;

  const statusConfig = {
    green:  { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700',  dot: 'bg-emerald-500',  badge: 'bg-emerald-100' },
    orange: { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',    dot: 'bg-amber-500',    badge: 'bg-amber-100'  },
    red:    { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',      dot: 'bg-red-500',      badge: 'bg-red-100'    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              {origin.city} → {destination.city}
            </h3>
            <p className="text-xs text-slate-400">
              {origin.code} → {destination.code} · {routes.length} route{routes.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        {routes.length > 0 && (
          <span className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
            Sorted by efficiency
          </span>
        )}
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-amber-800 text-xs">{warning}</p>
        </div>
      )}

      {/* No routes */}
      {routes.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium text-sm">No viable routes found</p>
          <p className="text-slate-400 text-xs mt-1">The required hubs may be in closed airspace regions</p>
        </div>
      )}

      {/* Route cards */}
      <div className="space-y-4">
        {routes.map((route, idx) => {
          const cfg    = statusConfig[route.status.color] || statusConfig.green;
          const isBest = idx === 0;
          const isOpen = openRouteId === route.id;

          return (
            <div key={route.id}>
              <div className={`route-card relative rounded-xl border p-4 ${cfg.border} ${cfg.bg} ${isOpen ? 'rounded-b-none border-b-0' : ''}`}>
                {isBest && (
                  <div className="absolute -top-2.5 left-4">
                    <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-600 text-white rounded-full shadow-sm">
                      ★ Best Route
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  {/* Route path */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-2">
                      {route.stops.map((stop, sIdx) => (
                        <span key={stop.code} className="flex items-center gap-1.5">
                          <span className="inline-flex flex-col items-center">
                            <span className={`font-bold text-base ${sIdx === 0 ? 'text-blue-700' : sIdx === route.stops.length - 1 ? 'text-red-600' : 'text-slate-700'}`}>
                              {stop.code}
                            </span>
                            <span className="text-xs text-slate-400 font-normal leading-none">{stop.city}</span>
                          </span>
                          {sIdx < route.stops.length - 1 && (
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                      {route.legs.map((leg, lIdx) => (
                        <span key={lIdx}>
                          {leg.from.code}→{leg.to.code}: {leg.distance.toLocaleString()} km
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right side: status + CTA */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {route.status.label}
                    </div>
                    <span className="text-xs text-slate-400">{route.totalDistance.toLocaleString()} km</span>
                    <span className="text-xs text-slate-400">
                      {route.stops_count === 0 ? 'Direct' : `${route.stops_count} stop${route.stops_count > 1 ? 's' : ''}`}
                    </span>

                    {/* Check Availability button */}
                    <button
                      onClick={() => setOpenRouteId(isOpen ? null : route.id)}
                      className={`mt-1 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition
                        ${isOpen
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                          : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                        }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      {isOpen ? 'Hide' : 'Check Availability'}
                      <svg
                        className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-3 right-4 text-xs text-slate-300 font-medium">
                  Option {idx + 1}
                </div>
              </div>

              {/* Expandable availability panel */}
              {isOpen && (
                <div className={`rounded-b-xl border ${cfg.border} border-t-0 px-4 pb-4 ${cfg.bg}`}>
                  <FlightAvailability
                    route={route}
                    onClose={() => setOpenRouteId(null)}
                    defaultDate={date}
                    defaultAdults={adults}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {routes.length > 0 && (
        <p className="text-xs text-slate-400 mt-4 flex items-start gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Distances are great-circle estimates. Click "Check Availability" to see live seat counts via Amadeus.
        </p>
      )}
    </div>
  );
}
