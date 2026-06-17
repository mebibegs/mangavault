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
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <a href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
              Manga<span className="text-text-muted">Vault</span>
              <span className="text-text-muted text-xs sm:text-sm font-normal ml-1 sm:ml-2">API</span>
            </h1>
          </a>
          <a href="/" className="text-xs sm:text-sm text-white hover:text-gray-300 transition-colors border border-border-bright rounded-lg px-2.5 sm:px-3 py-1.5 hover:border-white/30 flex-shrink-0 bg-bg-card">
            ← Back
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        {/* Overview */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">API Reference</h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl leading-relaxed">
            Search and discover <span className="text-white font-medium">Manga</span>,{" "}
            <span className="text-white font-medium">Manhwa</span>,{" "}
            <span className="text-white font-medium">Manhua</span>,{" "}
            <span className="text-white font-medium">Anime</span>,{" "}
            <span className="text-white font-medium">Donghua</span>, and{" "}
            <span className="text-white font-medium">Webtoon</span> content
            across multiple databases simultaneously. All searches run in parallel
            for maximum speed.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
            <StatusBadge label="Base URL" value="/api" />
            <StatusBadge label="Format" value="JSON" />
            <StatusBadge label="Auth" value="None" />
            <StatusBadge label="Rate Limit" value="15 req/min" />
          </div>
        </section>

        {/* Supported Content */}
        <section className="mb-8 sm:mb-12">
          <h3 className="text-lg sm:text-xl font-bold mb-4">Supported Content Types</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {["Manga", "Manhwa", "Manhua", "Anime", "Donghua", "Webtoon"].map((t) => (
              <div key={t} className="glass-card rounded-xl p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm font-semibold text-white">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Example */}
        <section className="mb-8 sm:mb-12">
          <div className="glass-card rounded-xl overflow-hidden border border-green-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-border-subtle bg-green-500/5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Try it Live</h3>
                <p className="text-text-muted text-xs mt-0.5">Click the button to run a real API request</p>
              </div>
              <button
                onClick={runLiveExample}
                disabled={liveLoading}
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-black font-medium text-xs sm:text-sm rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex-shrink-0 w-full sm:w-auto"
              >
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
                  <button
                    onClick={() => copyToClipboard(liveResult, "live")}
                    className="absolute top-2 right-2 px-2 py-1 text-xs text-white bg-bg-hover rounded transition-colors hover:bg-border-bright z-10"
                  >
                    {copied === "live" ? "Copied!" : "Copy"}
                  </button>
                  <pre className="p-3 sm:p-4 overflow-x-auto max-h-80 text-[10px] sm:text-xs">
                    <code className="text-green-400/80 font-mono whitespace-pre-wrap break-all">{liveResult}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Search endpoint */}
        <section className="mb-8 sm:mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 p-4 sm:p-5 border-b border-border-subtle">
              <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">GET</span>
              <code className="text-sm sm:text-base font-mono text-white break-all">/api/search</code>
            </div>

            <div className="p-4 sm:p-5 space-y-5 sm:space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Description</h4>
                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                  Search for manga, manhwa, manhua, anime, donghua, and webtoon content across
                  multiple sources in parallel. Results are deduplicated and aggregated from all available databases.
                </p>
              </div>

              {/* Parameters */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Query Parameters</h4>
                <div className="rounded-lg border border-border-subtle overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[400px]">
                    <thead>
                      <tr className="bg-bg-card">
                        <th className="text-left px-3 sm:px-4 py-2 sm:py-2.5 text-text-muted font-medium text-xs uppercase">Parameter</th>
                        <th className="text-left px-3 sm:px-4 py-2 sm:py-2.5 text-text-muted font-medium text-xs uppercase">Type</th>
                        <th className="text-left px-3 sm:px-4 py-2 sm:py-2.5 text-text-muted font-medium text-xs uppercase">Required</th>
                        <th className="text-left px-3 sm:px-4 py-2 sm:py-2.5 text-text-muted font-medium text-xs uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border-subtle">
                        <td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs bg-bg-hover px-1.5 py-0.5 rounded">q</code></td>
                        <td className="px-3 sm:px-4 py-2.5 text-text-secondary">string</td>
                        <td className="px-3 sm:px-4 py-2.5"><span className="text-red-400 text-xs font-medium">Yes</span></td>
                        <td className="px-3 sm:px-4 py-2.5 text-text-secondary">Search query (2–100 chars)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example Request */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Example Request</h4>
                <CodeBlock id="curl" code={`GET /api/search?q=solo+leveling`} onCopy={copyToClipboard} copied={copied === "curl"} />
              </div>

              {/* Response Codes */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Response Codes</h4>
                <div className="space-y-1.5 sm:space-y-2">
                  <ResponseCode code="200" label="OK" desc="Successful search with results" color="green" />
                  <ResponseCode code="400" label="Bad Request" desc="Missing or invalid query" color="yellow" />
                  <ResponseCode code="403" label="Forbidden" desc="IP blocked or bot detected" color="red" />
                  <ResponseCode code="429" label="Too Many Requests" desc="Rate limit exceeded" color="orange" />
                  <ResponseCode code="500" label="Server Error" desc="Internal server error" color="red" />
                </div>
              </div>

              {/* Response Headers */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Response Headers</h4>
                <div className="rounded-lg border border-border-subtle overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[400px]">
                    <thead>
                      <tr className="bg-bg-card">
                        <th className="text-left px-3 sm:px-4 py-2 sm:py-2.5 text-text-muted font-medium text-xs uppercase">Header</th>
                        <th className="text-left px-3 sm:px-4 py-2 sm:py-2.5 text-text-muted font-medium text-xs uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border-subtle">
                        <td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs">X-RateLimit-Remaining</code></td>
                        <td className="px-3 sm:px-4 py-2.5 text-text-secondary">Remaining requests in window</td>
                      </tr>
                      <tr className="border-t border-border-subtle">
                        <td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs">X-RateLimit-Reset</code></td>
                        <td className="px-3 sm:px-4 py-2.5 text-text-secondary">Seconds until rate limit resets</td>
                      </tr>
                      <tr className="border-t border-border-subtle">
                        <td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs">Retry-After</code></td>
                        <td className="px-3 sm:px-4 py-2.5 text-text-secondary">Seconds to wait (only on 429)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example Response */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Example Response (200)</h4>
                <CodeBlock
                  id="response"
                  code={JSON.stringify({
                    success: true,
                    results: [{
                      title: "Solo Leveling",
                      description: "10 years ago, after the Gate...",
                      rating: "9.8",
                      status: "Completed",
                      type: "Manhwa",
                      genres: ["Action", "Adventure", "Fantasy"],
                      chapters: [{ title: "Chapter 201", url: "https://...", date: "" }],
                      chapterCount: "201",
                      coverUrl: "https://...",
                      url: "https://...",
                      source: "Source A",
                      author: "Chugong",
                      artist: "REDICE STUDIO",
                    }],
                    count: 1,
                    query: "solo leveling",
                  }, null, 2)}
                  onCopy={copyToClipboard}
                  copied={copied === "response"}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trending endpoint */}
        <section className="mb-8 sm:mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 p-4 sm:p-5 border-b border-border-subtle">
              <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">GET</span>
              <code className="text-sm sm:text-base font-mono text-white break-all">/api/trending</code>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                Returns paginated trending content from all sources. 30 results per page, up to 500+ titles.
              </p>
              <div className="rounded-lg border border-border-subtle overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[400px]">
                  <thead>
                    <tr className="bg-bg-card">
                      <th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Parameter</th>
                      <th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Type</th>
                      <th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Default</th>
                      <th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border-subtle">
                      <td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs bg-bg-hover px-1.5 py-0.5 rounded">page</code></td>
                      <td className="px-3 sm:px-4 py-2.5 text-text-secondary">number</td>
                      <td className="px-3 sm:px-4 py-2.5 text-text-secondary">1</td>
                      <td className="px-3 sm:px-4 py-2.5 text-text-secondary">Page number (1–17)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock id="trending-ex" code="GET /api/trending?page=2" onCopy={copyToClipboard} copied={copied === "trending-ex"} />
            </div>
          </div>
        </section>

        {/* Health endpoint */}
        <section className="mb-8 sm:mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 p-4 sm:p-5 border-b border-border-subtle">
              <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">GET</span>
              <code className="text-sm sm:text-base font-mono text-white">/api/health</code>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-text-secondary text-xs sm:text-sm">
                Health check endpoint. Returns <code className="text-white font-mono text-xs bg-bg-hover px-1.5 py-0.5 rounded">{"{ ok: true }"}</code> when the service is running.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 text-center">
          <p className="text-text-muted text-xs">MangaVault API — Manga · Manhwa · Manhua · Anime · Donghua · Webtoon</p>
        </div>
      </footer>
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-bg-card border border-border-subtle rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2">
      <span className="text-[10px] sm:text-xs text-text-muted">{label}:</span>
      <span className="text-[10px] sm:text-xs text-white font-mono">{value}</span>
    </div>
  );
}

function CodeBlock({ id, code, onCopy, copied }: { id: string; code: string; onCopy: (text: string, id: string) => void; copied: boolean }) {
  return (
    <div className="relative rounded-lg bg-bg-card border border-border-subtle overflow-hidden">
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 py-1 text-xs text-white bg-bg-hover rounded transition-colors hover:bg-border-bright z-10"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="p-3 sm:p-4 overflow-x-auto text-[10px] sm:text-xs md:text-sm">
        <code className="text-text-secondary font-mono whitespace-pre-wrap break-all">{code}</code>
      </pre>
    </div>
  );
}

function ResponseCode({ code, label, desc, color }: { code: string; label: string; desc: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: "text-green-400 bg-green-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
    orange: "text-orange-400 bg-orange-500/10",
  };
  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-bg-card rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 border border-border-subtle flex-wrap">
      <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded ${colorMap[color]}`}>{code}</span>
      <span className="text-xs sm:text-sm text-white font-medium">{label}</span>
      <span className="text-[10px] sm:text-xs text-text-muted">— {desc}</span>
    </div>
  );
}
