import { useEffect, useState, useRef } from 'react';

const PRIORITY_CONFIG = {
  high:   { bg: 'bg-red-50',    border: 'border-red-200',   dot: 'bg-red-500',    text: 'text-red-700'   },
  medium: { bg: 'bg-amber-50',  border: 'border-amber-200', dot: 'bg-amber-500',  text: 'text-amber-700' },
  low:    { bg: 'bg-emerald-50',border: 'border-emerald-200',dot:'bg-emerald-500', text: 'text-emerald-700'},
};

export default function UpdatesPanel() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch('/api/updates')
      .then((r) => r.json())
      .then((d) => { setUpdates(d.updates || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col h-full max-h-[520px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div className="relative w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">Aviation Updates</h2>
          <p className="text-xs text-slate-400">Live disruption feed</p>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-2 border-b border-slate-100 flex gap-4 shrink-0">
        {[['red', 'Closed'],['amber','Limited'],['emerald','Open']].map(([color, label]) => (
          <div key={color} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full bg-${color}-500`} />
            {label}
          </div>
        ))}
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin"
      >
        {loading && (
          <div className="space-y-2">
            {[1,2,3,4,5].map(n => (
              <div key={n} className="rounded-xl border border-slate-100 p-3 animate-pulse">
                <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && updates.map((item) => {
          const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
          return (
            <div
              key={item.id}
              className={`feed-item rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}
            >
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-relaxed">{item.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-400 font-medium">{item.time}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-xs text-slate-400">{item.source}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 shrink-0">
        <p className="text-xs text-slate-400 text-center">
          For official NOTAMs visit{' '}
          <a
            href="https://www.icao.int"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            icao.int
          </a>
        </p>
      </div>
    </div>
  );
}
