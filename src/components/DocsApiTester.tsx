"use client";

import { useState } from "react";

export function ApiTester() {
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mb-8 sm:mb-12">
      <div className="glass-card rounded-xl overflow-hidden border border-green-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-border-subtle bg-green-500/5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Try it Live</h3>
            <p className="text-text-muted text-xs mt-0.5">
              Send a real request to the API and see exactly what comes back
            </p>
          </div>
          <button
            onClick={runLiveExample}
            disabled={liveLoading}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-black font-medium text-xs sm:text-sm rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex-shrink-0 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
          >
            {liveLoading ? "Fetching..." : "▶ Run Example"}
          </button>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20">
              GET
            </span>
            <code className="text-xs sm:text-sm font-mono text-text-secondary break-all">
              /api/search?q=solo+leveling
            </code>
          </div>
          {liveResult && (
            <div className="relative rounded-lg bg-bg-primary border border-border-subtle overflow-hidden">
              <button
                onClick={() => copyToClipboard(liveResult)}
                className="absolute top-2 right-2 px-2 py-1 text-xs text-white bg-bg-hover rounded transition-colors hover:bg-border-bright z-10 cursor-pointer"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <pre className="p-3 sm:p-4 overflow-x-auto max-h-80 text-[10px] sm:text-xs">
                <code className="text-green-400/80 font-mono whitespace-pre-wrap break-all">
                  {liveResult}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function EndpointCard({
  method,
  path,
  description,
  params,
  example,
}: {
  method: string;
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; desc: string }[];
  example: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-border-subtle">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left cursor-pointer hover:bg-bg-hover transition-colors focus:outline-none"
      >
        <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0">
          {method}
        </span>
        <code className="text-sm font-mono text-white flex-1">{path}</code>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-border-subtle p-4 sm:p-5 space-y-4">
          <p className="text-text-secondary text-sm">{description}</p>
          {params.length > 0 && (
            <div>
              <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Parameters</h4>
              <div className="space-y-2">
                {params.map((p) => (
                  <div
                    key={p.name}
                    className="flex flex-wrap gap-2 items-start bg-bg-primary rounded-lg p-3 border border-border-subtle"
                  >
                    <code className="text-xs font-mono text-white">{p.name}</code>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted">
                      {p.type}
                    </span>
                    {p.required && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                        required
                      </span>
                    )}
                    <span className="text-xs text-text-secondary flex-1">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Example</h4>
            <pre className="bg-bg-primary rounded-lg p-3 border border-border-subtle overflow-x-auto text-[10px] sm:text-xs text-green-400/80 font-mono">
              {example}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
