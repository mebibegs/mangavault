"use client";

import { useState } from "react";

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function runLiveExample() {
    setLiveLoading(true);
    setLiveResult(null);
    try {
      const res = await fetch("/api/search?q=solo+leveling");
      const data = await res.json();
      setLiveResult(JSON.stringify(data, null, 2));
    } catch {
      setLiveResult('{ "error": "Request failed. Try again." }');
    } finally {
      setLiveLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <a href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <span className="text-base sm:text-xl font-bold tracking-tight truncate">Manga<span className="text-text-muted">Vault</span> <span className="text-text-muted text-xs sm:text-sm font-normal ml-1">API Docs</span></span>
          </a>
          <a href="/" className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-2.5 sm:px-3 py-1.5 hover:bg-bg-hover transition-colors flex-shrink-0">← Home</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">API Reference</h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl leading-relaxed">
            The MangaVault API searches manga, manhwa, manhua, anime, donghua, and webtoon content across multiple sources in a single request. Source queries run in parallel, and results are deduplicated and ranked before being returned.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Badge label="Base URL" value="/api" />
            <Badge label="Format" value="JSON" />
            <Badge label="Auth" value="None" />
            <Badge label="Rate Limit" value="15 req/min" />
            <Badge label="Version" value="v1.0.0" />
          </div>
        </section>

        <section className="mb-8 sm:mb-12">
          <div className="glass-card rounded-xl overflow-hidden border border-green-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-border-subtle bg-green-500/5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Try it Live</h3>
                <p className="text-text-muted text-xs mt-0.5">Send a real request to the API and see exactly what comes back</p>
              </div>
              <button onClick={runLiveExample} disabled={liveLoading} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-black font-medium text-xs sm:text-sm rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex-shrink-0 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer">
                {liveLoading ? "Fetching..." : "▶ Run Example"}
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20">GET</span>
                <code className="text-xs sm:text-sm font-mono text-text-secondary break-all">/api/search?q=solo+leveling</code>
              </div>
              {liveResult && (
                <div className="relative rounded-lg bg-bg-primary border border-border-subtle overflow-hidden">
                  <button onClick={() => copyToClipboard(liveResult, "live")} className="absolute top-2 right-2 px-2 py-1 text-xs text-white bg-bg-hover rounded transition-colors hover:bg-border-bright z-10 cursor-pointer">{copied === "live" ? "Copied!" : "Copy"}</button>
                  <pre className="p-3 sm:p-4 overflow-x-auto max-h-80 text-[10px] sm:text-xs"><code className="text-green-400/80 font-mono whitespace-pre-wrap break-all">{liveResult}</code></pre>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault · v1.0.0</span>
          <div className="flex gap-4">
            <a href="/" className="hover:text-white transition-colors cursor-pointer">Home</a>
            <a href="/about" className="hover:text-white transition-colors cursor-pointer">About</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center gap-2 bg-bg-card border border-border-subtle rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2"><span className="text-[10px] sm:text-xs text-text-muted">{label}:</span><span className="text-[10px] sm:text-xs text-white font-mono">{value}</span></div>;
}
