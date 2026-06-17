"use client";

import { useState, useRef, useCallback } from "react";

interface ChapterInfo {
  title: string;
  url: string;
  date: string;
}

interface MangaResult {
  title: string;
  description: string;
  rating: string;
  status: string;
  type: string;
  genres: string[];
  chapters: ChapterInfo[];
  chapterCount: string;
  coverUrl: string;
  url: string;
  source: string;
  author: string;
  artist: string;
}

type SearchPhase =
  | "idle"
  | "connecting"
  | "scanning"
  | "analyzing"
  | "compiling"
  | "done"
  | "error";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaResult[]>([]);
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState<MangaResult | null>(
    null
  );
  const [showChapters, setShowChapters] = useState(false);
  const [statusText, setStatusText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const phaseLabels: Record<SearchPhase, string> = {
    idle: "",
    connecting: "Establishing secure connections...",
    scanning: "Scanning databases in parallel...",
    analyzing: "Analyzing and cross-referencing data...",
    compiling: "Compiling results...",
    done: "",
    error: "",
  };

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!query.trim() || query.trim().length < 2) return;

      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setResults([]);
      setSelectedResult(null);
      setShowChapters(false);
      setError("");

      // Smooth phase transitions
      setPhase("connecting");
      setStatusText(phaseLabels.connecting);
      await sleep(600);

      setPhase("scanning");
      setStatusText(phaseLabels.scanning);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: abortRef.current.signal }
        );

        setPhase("analyzing");
        setStatusText(phaseLabels.analyzing);
        await sleep(400);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Search failed");
        }

        const data = await res.json();

        setPhase("compiling");
        setStatusText(phaseLabels.compiling);
        await sleep(300);

        setResults(data.results || []);
        setPhase("done");
        setStatusText(
          data.results?.length > 0
            ? `Found ${data.results.length} result${data.results.length !== 1 ? "s" : ""}`
            : "No results found. Try a different search term."
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setPhase("error");
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setStatusText("");
      }
    },
    [query]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              Manga<span className="text-text-muted">Vault</span>
            </h1>
          </div>
          <a
            href="/docs"
            className="text-xs sm:text-sm text-text-muted hover:text-white transition-colors duration-200 border border-border-subtle rounded-lg px-3 py-1.5 hover:border-border-bright"
          >
            API Docs
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Hero/Search area */}
        <div
          className={`transition-all duration-700 ease-out ${
            results.length > 0 || phase === "done"
              ? "pt-6 sm:pt-8"
              : "pt-16 sm:pt-28 md:pt-36"
          }`}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            {/* Title - only show prominently when no results */}
            <div
              className={`text-center transition-all duration-700 overflow-hidden ${
                results.length > 0 || phase === "done"
                  ? "max-h-0 opacity-0 mb-0"
                  : "max-h-48 opacity-100 mb-8 sm:mb-12"
              }`}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
                Search{" "}
                <span className="text-text-muted">Everything</span>
              </h2>
              <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto">
                Instantly search across multiple manga &amp; manhwa databases.
                Results aggregated from parallel sources in real-time.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <div className="search-glow rounded-2xl transition-all duration-300 bg-bg-card">
                <div className="flex items-center">
                  <div className="pl-4 sm:pl-5 pr-2 sm:pr-3 text-text-muted">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search manga, manhwa, manhua..."
                    className="flex-1 bg-transparent py-4 sm:py-5 text-sm sm:text-base text-white placeholder-text-muted outline-none"
                    autoFocus
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setResults([]);
                        setPhase("idle");
                        setSelectedResult(null);
                        setError("");
                      }}
                      className="px-2 text-text-muted hover:text-white transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={
                      !query.trim() ||
                      phase === "connecting" ||
                      phase === "scanning" ||
                      phase === "analyzing" ||
                      phase === "compiling"
                    }
                    className="mr-2 sm:mr-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-black font-medium text-sm rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>

            {/* Loading / Status indicator */}
            {phase !== "idle" && phase !== "done" && phase !== "error" && (
              <div className="mt-6 animate-fade-in-up">
                <LoadingIndicator phase={phase} statusText={statusText} />
              </div>
            )}

            {/* Error */}
            {phase === "error" && (
              <div className="mt-6 animate-fade-in-up">
                <div className="glass-card rounded-xl p-4 border border-red-900/30">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Status text for done */}
            {phase === "done" && (
              <p className="text-text-muted text-xs sm:text-sm mt-3 text-center animate-fade-in-up">
                {statusText}
              </p>
            )}
          </div>
        </div>

        {/* Results grid */}
        {results.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 pb-12 w-full animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result, idx) => (
                <ResultCard
                  key={`${result.title}-${idx}`}
                  result={result}
                  index={idx}
                  onClick={() => {
                    setSelectedResult(result);
                    setShowChapters(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedResult && (
        <DetailModal
          result={selectedResult}
          showChapters={showChapters}
          onToggleChapters={() => setShowChapters(!showChapters)}
          onClose={() => {
            setSelectedResult(null);
            setShowChapters(false);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-text-muted text-xs">
            MangaVault &mdash; Aggregated search engine
          </p>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
            <a
              href="/docs"
              className="text-text-muted text-xs hover:text-white transition-colors"
            >
              API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─── */

function LoadingIndicator({
  phase,
  statusText,
}: {
  phase: SearchPhase;
  statusText: string;
}) {
  const steps = [
    { key: "connecting", label: "Connecting", desc: "Establishing secure connections..." },
    { key: "scanning", label: "Scanning", desc: "Scanning databases in parallel..." },
    { key: "analyzing", label: "Analyzing", desc: "Cross-referencing results..." },
    { key: "compiling", label: "Compiling", desc: "Compiling final results..." },
  ] as const;
  const currentIdx = steps.findIndex((s) => s.key === phase);

  return (
    <div className="glass-card rounded-xl p-5 sm:p-6">
      <div className="flex flex-col gap-0">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={step.key} className="flex items-stretch gap-3 sm:gap-4">
              {/* Vertical line + circle */}
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-500 flex-shrink-0 ${
                    isCompleted
                      ? "border-green-500 bg-green-500"
                      : isActive
                        ? "border-green-400 bg-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                        : "border-border-bright bg-bg-card"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-3.5 h-3.5 text-black"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-border-bright" />
                  )}
                </div>

                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-6 my-0.5 transition-colors duration-500 rounded-full"
                    style={{
                      background: isCompleted
                        ? "#22c55e"
                        : isActive
                          ? "linear-gradient(to bottom, #22c55e, #222)"
                          : "#222",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-5 ${idx === steps.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-sm font-semibold transition-colors duration-300 ${
                      isCompleted
                        ? "text-green-400"
                        : isActive
                          ? "text-white"
                          : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </h4>
                  {isCompleted && (
                    <span className="text-[10px] font-medium text-green-500/80 bg-green-500/10 px-1.5 py-0.5 rounded-full leading-none">
                      Done
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] font-medium text-green-400/80 bg-green-500/10 px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                      In Progress
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 transition-colors duration-300 ${
                    isActive
                      ? "text-text-secondary"
                      : isPending
                        ? "text-text-muted/50"
                        : "text-text-muted"
                  }`}
                >
                  {step.desc}
                </p>

                {/* Active step spinner */}
                {isActive && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="dot-loading-green flex gap-1">
                      <span />
                      <span />
                      <span />
                    </div>
                    <p className="text-xs text-green-400/70">{statusText}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  index,
  onClick,
}: {
  result: MangaResult;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl p-4 sm:p-5 text-left transition-all duration-300 hover:scale-[1.02] group cursor-pointer w-full"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex gap-4">
        {/* Cover image */}
        {result.coverUrl ? (
          <div className="w-16 h-22 sm:w-20 sm:h-28 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover">
            <img
              src={result.coverUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="w-16 h-22 sm:w-20 sm:h-28 rounded-lg bg-bg-hover flex-shrink-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base text-white truncate group-hover:text-gray-200 transition-colors">
            {result.title}
          </h3>
          <p className="text-text-muted text-xs mt-1 line-clamp-2">
            {result.description.substring(0, 120)}
            {result.description.length > 120 ? "..." : ""}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {result.rating !== "N/A" && (
              <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded-md">
                <svg
                  className="w-3 h-3 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {result.rating}
              </span>
            )}
            <span className="text-xs text-text-muted">
              {result.chapterCount} chs
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-md ${
                result.status.toLowerCase() === "completed"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-blue-500/10 text-blue-400"
              }`}
            >
              {result.status}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailModal({
  result,
  showChapters,
  onToggleChapters,
  onClose,
}: {
  result: MangaResult;
  showChapters: boolean;
  onToggleChapters: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-2xl max-h-[90vh] bg-bg-secondary border border-border-subtle rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border-subtle">
          <div className="flex gap-4 flex-1 min-w-0">
            {result.coverUrl ? (
              <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover">
                <img
                  src={result.coverUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg bg-bg-card flex-shrink-0 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {result.title}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.rating !== "N/A" && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-md">
                    <svg
                      className="w-3 h-3 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {result.rating}
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-1 rounded-md ${
                    result.status.toLowerCase() === "completed"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {result.status}
                </span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-text-secondary">
                  {result.type}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ml-3 p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-white flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            <MetaItem label="Author" value={result.author} />
            <MetaItem label="Artist" value={result.artist} />
            <MetaItem label="Chapters" value={result.chapterCount} />
            <MetaItem label="Source" value={result.source} />
          </div>

          {/* Genres */}
          {result.genres.length > 0 && (
            <div>
              <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">
                Genres
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-text-secondary border border-border-subtle"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              {result.description}
            </p>
          </div>

          {/* Chapters toggle */}
          {result.chapters.length > 0 && (
            <div>
              <button
                onClick={onToggleChapters}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-bg-card border border-border-subtle hover:border-border-bright transition-all"
              >
                <span className="text-sm font-medium text-white">
                  Chapters ({result.chapters.length})
                </span>
                <svg
                  className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                    showChapters ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showChapters && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle">
                  {result.chapters.map((ch, idx) => (
                    <a
                      key={idx}
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-hover transition-colors group"
                    >
                      <span className="text-sm text-text-secondary group-hover:text-white transition-colors truncate">
                        {ch.title}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {ch.date && (
                          <span className="text-xs text-text-muted">
                            {ch.date}
                          </span>
                        )}
                        <svg
                          className="w-3.5 h-3.5 text-text-muted group-hover:text-white transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Visit link */}
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Visit Source →
          </a>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card rounded-lg p-3 border border-border-subtle">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-text-primary truncate">
        {value || "Unknown"}
      </p>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
