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
        {/* Overview */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">API Reference</h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl leading-relaxed">
            The MangaVault API searches manga, manhwa, manhua, anime, donghua, and webtoon content across multiple sources in a single request. Source queries run in parallel, so a search through this API typically returns about as fast as querying one source directly — but with results from several. Everything that comes back has already been deduplicated and ranked by relevance.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Badge label="Base URL" value="/api" />
            <Badge label="Format" value="JSON" />
            <Badge label="Auth" value="None" />
            <Badge label="Rate Limit" value="15 req/min" />
            <Badge label="Version" value="v1.0.0" />
          </div>
        </section>

        {/* Live Example */}
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

        {/* GET /api/search */}
        <section className="mb-8 sm:mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 p-4 sm:p-5 border-b border-border-subtle">
              <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">GET</span>
              <code className="text-sm sm:text-base font-mono text-white break-all">/api/search</code>
            </div>
            <div className="p-4 sm:p-5 space-y-5 sm:space-y-6">
              <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                Takes a single search query, checks it against every connected source at once, removes duplicate titles from the combined results, and returns one ranked list.
              </p>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Query Parameters</h4>
                <div className="rounded-lg border border-border-subtle overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[400px]">
                    <thead><tr className="bg-bg-card"><th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Parameter</th><th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Type</th><th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Required</th><th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Description</th></tr></thead>
                    <tbody><tr className="border-t border-border-subtle"><td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs bg-bg-hover px-1.5 py-0.5 rounded">q</code></td><td className="px-3 sm:px-4 py-2.5 text-text-secondary">string</td><td className="px-3 sm:px-4 py-2.5"><span className="text-red-400 text-xs font-medium">Yes</span></td><td className="px-3 sm:px-4 py-2.5 text-text-secondary">Search query (2–100 chars)</td></tr></tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Code Samples</h4>
                <div className="space-y-3">
                  <div><p className="text-text-muted text-[10px] sm:text-xs mb-1.5 font-medium uppercase tracking-wider">cURL</p><Code id="s-curl" code={`curl "https://your-domain.com/api/search?q=solo+leveling"`} onCopy={copyToClipboard} copied={copied === "s-curl"} /></div>
                  <div><p className="text-text-muted text-[10px] sm:text-xs mb-1.5 font-medium uppercase tracking-wider">JavaScript</p><Code id="s-js" code={`const res = await fetch("/api/search?q=solo+leveling");\nconst data = await res.json();\nconsole.log(data.results);`} onCopy={copyToClipboard} copied={copied === "s-js"} /></div>
                  <div><p className="text-text-muted text-[10px] sm:text-xs mb-1.5 font-medium uppercase tracking-wider">Python</p><Code id="s-py" code={`import requests\nres = requests.get("https://your-domain.com/api/search", params={"q": "solo leveling"})\nfor manga in res.json()["results"]:\n    print(manga["title"], manga["rating"])`} onCopy={copyToClipboard} copied={copied === "s-py"} /></div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Response Codes</h4>
                <div className="space-y-1.5 sm:space-y-2">
                  <StatusCode code="200" label="OK" desc="Successful search with results" color="green" />
                  <StatusCode code="400" label="Bad Request" desc="Missing or invalid query" color="yellow" />
                  <StatusCode code="403" label="Forbidden" desc="IP blocked or bot detected" color="red" />
                  <StatusCode code="429" label="Too Many Requests" desc="Rate limit exceeded" color="orange" />
                  <StatusCode code="500" label="Server Error" desc="Internal server error" color="red" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Error Response Examples</h4>
                <div className="space-y-3">
                  <div><p className="text-text-muted text-[10px] mb-1.5 font-medium">400 Bad Request</p><Code id="e400" code={`{\n  "error": "Bad Request",\n  "message": "Query parameter 'q' is required."\n}`} onCopy={copyToClipboard} copied={copied === "e400"} /></div>
                  <div><p className="text-text-muted text-[10px] mb-1.5 font-medium">429 Too Many Requests</p><Code id="e429" code={`{\n  "error": "Too Many Requests",\n  "message": "Rate limit exceeded. Try again in 12 seconds.",\n  "retryAfter": 12\n}`} onCopy={copyToClipboard} copied={copied === "e429"} /></div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Response Headers</h4>
                <div className="rounded-lg border border-border-subtle overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[400px]">
                    <thead><tr className="bg-bg-card"><th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Header</th><th className="text-left px-3 sm:px-4 py-2 text-text-muted font-medium text-xs uppercase">Description</th></tr></thead>
                    <tbody>
                      <tr className="border-t border-border-subtle"><td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs">X-RateLimit-Remaining</code></td><td className="px-3 sm:px-4 py-2.5 text-text-secondary">Remaining requests in window</td></tr>
                      <tr className="border-t border-border-subtle"><td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs">X-RateLimit-Reset</code></td><td className="px-3 sm:px-4 py-2.5 text-text-secondary">Unix timestamp when limit resets</td></tr>
                      <tr className="border-t border-border-subtle"><td className="px-3 sm:px-4 py-2.5"><code className="text-white font-mono text-xs">Retry-After</code></td><td className="px-3 sm:px-4 py-2.5 text-text-secondary">Seconds to wait (only on 429)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Success Response Example</h4>
                <Code id="resp" code={JSON.stringify({ success: true, results: [{ title: "Solo Leveling", description: "10 years ago, after the Gate...", rating: "9.8", status: "Completed", type: "Manhwa", genres: ["Action", "Adventure", "Fantasy"], chapters: [{ title: "Chapter 201", url: "Hidden — URLs are not exposed via the public API for security purposes.", date: "" }], chapterCount: "201", coverUrl: "Hidden — URLs are not exposed via the public API for security purposes.", url: "Hidden — URLs are not exposed via the public API for security purposes.", source: "Source A", author: "Chugong", artist: "REDICE STUDIO" }], count: 1, query: "solo leveling", rateLimit: { limit: 15, remaining: 14, resetIn: 58 } }, null, 2)} onCopy={copyToClipboard} copied={copied === "resp"} />
              </div>
            </div>
          </div>
        </section>



        {/* GET /api/health */}
        <section className="mb-8 sm:mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 p-4 sm:p-5 border-b border-border-subtle">
              <span className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">GET</span>
              <code className="text-sm sm:text-base font-mono text-white">/api/health</code>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-text-secondary text-xs sm:text-sm">
                A lightweight check that returns <code className="text-white font-mono text-xs bg-bg-hover px-1.5 py-0.5 rounded">{"{ ok: true }"}</code> when the service is up and responding normally. Worth calling before running a batch job, or on a schedule if you&apos;re monitoring uptime.
              </p>
            </div>
          </div>
        </section>

        {/* Behavior & Edge Cases */}
        <section className="mb-8 sm:mb-12">
          <h3 className="text-lg sm:text-xl font-bold mb-4">Behavior &amp; Edge Cases</h3>
          <div className="glass-card rounded-xl p-4 sm:p-5 space-y-4">
            {[
              { q: "Deduplication", a: "When the same title turns up from more than one source, only one entry survives in the final results — whichever version carries the most complete metadata." },
              { q: "Relevance ranking", a: "Results are ordered by how closely they match the query: exact title matches come first, followed by partial or word-level matches." },
              { q: "Rate limiting", a: "Each IP address is limited to 15 requests per minute. Going over that returns a 429 with a Retry-After header telling you how long to wait. Sending more than 100 requests in 5 minutes triggers a temporary block on top of the standard limit." },
              { q: "Timeouts", a: "Each upstream source is given 15 seconds to respond. A source that doesn\u2019t make it in time is simply left out of that response \u2014 you still get a result, just built from whichever sources responded in time." },
              { q: "Empty results", a: "A 200 response with an empty results array means no source had a match for that query, not that something went wrong. Worth trying a shorter query or an alternate spelling before assuming the title isn\u2019t indexed." },
              { q: "Error responses", a: "Every error follows the same shape \u2014 {\"error\": \"...\", \"message\": \"...\"} \u2014 and never exposes internal implementation details." },
            ].map((item, i) => (
              <div key={i} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                <h4 className="text-sm font-medium text-white mb-1">{item.q}</h4>
                <p className="text-text-muted text-xs leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Versioning */}
        <section className="mb-8 sm:mb-12">
          <h3 className="text-lg sm:text-xl font-bold mb-4">Versioning</h3>
          <div className="glass-card rounded-xl p-4 sm:p-5">
            <p className="text-text-secondary text-sm leading-relaxed">
              There&apos;s no version number in the URL today because none has been needed yet. If a breaking change ever becomes necessary, it&apos;ll live at a new path — <code className="text-white font-mono text-xs bg-bg-hover px-1 py-0.5 rounded">/api/v2</code> — rather than changing how existing endpoints respond, so anything built against the current API keeps working without modification.
            </p>
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

function Code({ id, code, onCopy, copied }: { id: string; code: string; onCopy: (t: string, id: string) => void; copied: boolean }) {
  return (
    <div className="relative rounded-lg bg-bg-card border border-border-subtle overflow-hidden">
      <button onClick={() => onCopy(code, id)} className="absolute top-2 sm:top-3 right-2 sm:right-3 px-2 py-1 text-xs text-white bg-bg-hover rounded transition-colors hover:bg-border-bright z-10 focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer">{copied ? "Copied!" : "Copy"}</button>
      <pre className="p-3 sm:p-4 overflow-x-auto text-[10px] sm:text-xs md:text-sm"><code className="text-text-secondary font-mono whitespace-pre-wrap break-all">{code}</code></pre>
    </div>
  );
}

function StatusCode({ code, label, desc, color }: { code: string; label: string; desc: string; color: string }) {
  const c: Record<string, string> = { green: "text-green-400 bg-green-500/10", yellow: "text-yellow-400 bg-yellow-500/10", red: "text-red-400 bg-red-500/10", orange: "text-orange-400 bg-orange-500/10" };
  return <div className="flex items-center gap-2 sm:gap-3 bg-bg-card rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 border border-border-subtle flex-wrap"><span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded ${c[color]}`}>{code}</span><span className="text-xs sm:text-sm text-white font-medium">{label}</span><span className="text-[10px] sm:text-xs text-text-muted">— {desc}</span></div>;
}
