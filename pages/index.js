import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import RouteForm from '../components/RouteForm';
import RouteResults from '../components/RouteResults';
import UpdatesPanel from '../components/UpdatesPanel';

// Dynamically import the map (no SSR — Leaflet requires window)
const AirspaceMap = dynamic(() => import('../components/AirspaceMap'), { ssr: false });

export default function Home() {
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const resultsRef = useRef(null);

  // Inject Leaflet CSS + JS from CDN (SSR-safe)
  useEffect(() => {
    if (document.getElementById('leaflet-css')) {
      setLeafletReady(true);
      return;
    }
    const link = document.createElement('link');
    link.id   = 'leaflet-css';
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  const handleSearch = async (from, to, date, passengers) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/routes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&adults=${passengers}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setResult(data);
        // Scroll to results on mobile
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    } catch (e) {
      setError('Network error. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>RouteHome — Alternate Flight Route Finder</title>
        <meta name="description" content="Find alternate flight routes when airspace closures disrupt normal travel. Real-time routing suggestions via major hub airports." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✈️</text></svg>" />
      </Head>

      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* ── Navbar ────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-xl text-slate-900 tracking-tight">RouteHome</span>
                <span className="hidden sm:inline ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Disruption Navigator
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Live status indicator */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Active disruptions detected
              </div>
              <a
                href="https://www.icao.int/safety/airnavigation/pages/notam.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition hidden md:block"
              >
                Official NOTAMs ↗
              </a>
            </div>
          </div>
        </header>

        {/* ── Hero banner ───────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Find Routes Around Airspace Closures
                </h1>
                <p className="text-blue-200 text-sm mt-1">
                  Suggesting alternate hub-based paths when your normal route is disrupted
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                {[
                  { icon: '🔴', label: 'Middle East', status: 'Closed' },
                  { icon: '🟠', label: 'N. Europe', status: 'Limited' },
                  { icon: '🟢', label: 'East Asia', status: 'Open' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <div className="text-lg">{item.icon}</div>
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-xs text-blue-200">{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content ──────────────────────────────────────────── */}
        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-6 min-w-0">
            {/* Route form */}
            <RouteForm onSearch={handleSearch} loading={loading} />

            {/* Map */}
            <div>
              {leafletReady ? (
                <AirspaceMap routeResult={result} />
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 h-[420px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Loading map…</p>
                  </div>
                </div>
              )}
            </div>

            {/* Route results */}
            <div ref={resultsRef}>
              <RouteResults result={result} error={error} loading={loading} />
            </div>
          </div>

          {/* Right column — Updates panel */}
          <div className="xl:sticky xl:top-20 xl:self-start">
            <UpdatesPanel />
          </div>
        </main>

        {/* ── Footer / Disclaimer ───────────────────────────────────── */}
        <footer className="bg-white border-t border-slate-200 mt-auto">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-slate-500 max-w-2xl">
                  <strong className="text-slate-700">Disclaimer:</strong> This tool provides informational routing suggestions only.
                  Always verify routes and availability with airlines and official aviation authorities before travel.
                  RouteHome does not book flights or guarantee route availability.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                <a href="https://www.icao.int" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition">ICAO</a>
                <a href="https://www.eurocontrol.int" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition">Eurocontrol</a>
                <a href="https://www.faa.gov/air_traffic/publications/atpubs/notam_html/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition">FAA NOTAMs</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
