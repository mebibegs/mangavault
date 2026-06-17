"use client";

import { useState } from "react";

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Manga<span className="text-text-muted">Vault</span>
                <span className="text-text-muted text-sm font-normal ml-2">API Docs</span>
              </h1>
            </a>
          </div>
          <a
            href="/"
            className="text-xs sm:text-sm text-text-muted hover:text-white transition-colors border border-border-subtle rounded-lg px-3 py-1.5 hover:border-border-bright"
          >
            ← Back to Search
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">API Reference</h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl leading-relaxed">
            The MangaVault API allows you to search manga, manhwa, and manhua
            across multiple databases simultaneously. All searches run in parallel
            for maximum speed.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <StatusBadge label="Base URL" value="/api" />
            <StatusBadge label="Format" value="JSON" />
            <StatusBadge label="Auth" value="None required" />
            <StatusBadge label="Rate Limit" value="10 req/min" />
          </div>
        </section>

        {/* Search endpoint */}
        <section className="mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-border-subtle">
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
                GET
              </span>
              <code className="text-sm sm:text-base font-mono text-white">
                /api/search
              </code>
            </div>

            <div className="p-5 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Description</h4>
                <p className="text-text-secondary text-sm">
                  Search for manga/manhwa across multiple sources in parallel. Results
                  are deduplicated and aggregated from all available databases.
                </p>
              </div>

              {/* Parameters */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Query Parameters
                </h4>
                <div className="rounded-lg border border-border-subtle overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-card">
                        <th className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase">
                          Parameter
                        </th>
                        <th className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase">
                          Type
                        </th>
                        <th className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase">
                          Required
                        </th>
                        <th className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border-subtle">
                        <td className="px-4 py-3">
                          <code className="text-white font-mono text-xs bg-bg-hover px-1.5 py-0.5 rounded">
                            q
                          </code>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">string</td>
                        <td className="px-4 py-3">
                          <span className="text-red-400 text-xs font-medium">Yes</span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          Search query (2–100 chars)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example Request */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Example Request
                </h4>
                <CodeBlock
                  id="curl"
                  code={`curl -X GET "https://yourdomain.com/api/search?q=solo+leveling"`}
                  onCopy={copyToClipboard}
                  copied={copied === "curl"}
                />
              </div>

              {/* Response Codes */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Response Codes
                </h4>
                <div className="space-y-2">
                  <ResponseCode code="200" label="OK" desc="Successful search with results" color="green" />
                  <ResponseCode code="400" label="Bad Request" desc="Missing or invalid query parameter" color="yellow" />
                  <ResponseCode code="403" label="Forbidden" desc="IP blocked or bot detected" color="red" />
                  <ResponseCode code="429" label="Too Many Requests" desc="Rate limit exceeded (10/min)" color="orange" />
                  <ResponseCode code="500" label="Server Error" desc="Internal server error" color="red" />
                </div>
              </div>

              {/* Response Headers */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Response Headers</h4>
                <div className="rounded-lg border border-border-subtle overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-bg-card">
                        <th className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase">
                          Header
                        </th>
                        <th className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border-subtle">
                        <td className="px-4 py-3">
                          <code className="text-white font-mono text-xs">X-RateLimit-Remaining</code>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">Remaining requests in current window</td>
                      </tr>
                      <tr className="border-t border-border-subtle">
                        <td className="px-4 py-3">
                          <code className="text-white font-mono text-xs">X-RateLimit-Reset</code>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">Seconds until rate limit resets</td>
                      </tr>
                      <tr className="border-t border-border-subtle">
                        <td className="px-4 py-3">
                          <code className="text-white font-mono text-xs">Retry-After</code>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">Seconds to wait (only on 429)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example Response */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Example Response (200)
                </h4>
                <CodeBlock
                  id="response"
                  code={JSON.stringify(
                    {
                      success: true,
                      results: [
                        {
                          title: "Solo Leveling",
                          description: "10 years ago, after the Gate...",
                          rating: "9.8",
                          status: "Completed",
                          type: "Manhwa",
                          genres: ["Action", "Adventure", "Fantasy"],
                          chapters: [
                            {
                              title: "Chapter 201",
                              url: "https://...",
                              date: "",
                            },
                          ],
                          chapterCount: "201",
                          coverUrl: "https://...",
                          url: "https://...",
                          source: "Source A",
                          author: "Chugong",
                          artist: "REDICE STUDIO",
                        },
                      ],
                      count: 1,
                      query: "solo leveling",
                    },
                    null,
                    2
                  )}
                  onCopy={copyToClipboard}
                  copied={copied === "response"}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Health endpoint */}
        <section className="mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-border-subtle">
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
                GET
              </span>
              <code className="text-sm sm:text-base font-mono text-white">
                /api/health
              </code>
            </div>
            <div className="p-5">
              <p className="text-text-secondary text-sm">
                Health check endpoint. Returns <code className="text-white font-mono text-xs bg-bg-hover px-1.5 py-0.5 rounded">{"{ status: \"ok\" }"}</code> when the service is running.
              </p>
            </div>
          </div>
        </section>

        {/* Docs endpoint */}
        <section className="mb-12">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-border-subtle">
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
                GET
              </span>
              <code className="text-sm sm:text-base font-mono text-white">
                /api/docs
              </code>
            </div>
            <div className="p-5">
              <p className="text-text-secondary text-sm">
                Returns the complete API documentation as JSON. Useful for programmatic access to the API schema.
              </p>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Security Measures</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SecurityCard
              icon="🛡️"
              title="Rate Limiting"
              desc="10 requests/minute per IP. Automatic throttling with Retry-After headers."
            />
            <SecurityCard
              icon="📝"
              title="Request Logging"
              desc="All requests logged: IP address, endpoint, timestamp, method, and errors."
            />
            <SecurityCard
              icon="⏱️"
              title="Timeout Protection"
              desc="12-second timeout on all external requests. No hanging connections."
            />
            <SecurityCard
              icon="🔒"
              title="Error Handling"
              desc="Internal details are never exposed. Generic error messages for all failures."
            />
            <SecurityCard
              icon="🚫"
              title="IP Blocking"
              desc="Automatic blocking for DDoS attempts, bots, and excessive abuse patterns."
            />
            <SecurityCard
              icon="📊"
              title="Usage Monitoring"
              desc="Detection of sudden spikes, high-volume requests, and unusual patterns."
            />
            <SecurityCard
              icon="🤖"
              title="Bot Detection"
              desc="Automated bot user-agents are detected and blocked immediately."
            />
            <SecurityCard
              icon="🧹"
              title="Input Sanitization"
              desc="All query inputs are sanitized to prevent XSS and injection attacks."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-text-muted text-xs">
            MangaVault API — Built with security and performance in mind
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-bg-card border border-border-subtle rounded-lg px-3 py-2">
      <span className="text-xs text-text-muted">{label}:</span>
      <span className="text-xs text-white font-mono">{value}</span>
    </div>
  );
}

function CodeBlock({
  id,
  code,
  onCopy,
  copied,
}: {
  id: string;
  code: string;
  onCopy: (text: string, id: string) => void;
  copied: boolean;
}) {
  return (
    <div className="relative rounded-lg bg-bg-card border border-border-subtle overflow-hidden">
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-3 right-3 px-2 py-1 text-xs text-text-muted hover:text-white bg-bg-hover rounded transition-colors"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm">
        <code className="text-text-secondary font-mono whitespace-pre-wrap break-all">
          {code}
        </code>
      </pre>
    </div>
  );
}

function ResponseCode({
  code,
  label,
  desc,
  color,
}: {
  code: string;
  label: string;
  desc: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    green: "text-green-400 bg-green-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
    orange: "text-orange-400 bg-orange-500/10",
  };

  return (
    <div className="flex items-center gap-3 bg-bg-card rounded-lg px-4 py-2.5 border border-border-subtle">
      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colorMap[color]}`}>
        {code}
      </span>
      <span className="text-sm text-white font-medium">{label}</span>
      <span className="text-xs text-text-muted hidden sm:inline">— {desc}</span>
    </div>
  );
}

function SecurityCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <p className="text-text-secondary text-xs leading-relaxed">{desc}</p>
    </div>
  );
}
