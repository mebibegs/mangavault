"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ChapterInfo { title: string; url: string; date: string; }

interface MangaResult {
  title: string; description: string; rating: string; status: string;
  type: string; genres: string[]; chapters: ChapterInfo[];
  chapterCount: string; coverUrl: string; url: string;
  source: string; author: string; artist: string;
}

type SearchPhase = "idle" | "connecting" | "scanning" | "analyzing" | "compiling" | "done" | "error";

const SAMPLE_QUERIES = ["Solo Leveling", "One Piece", "Tower of God", "Omniscient Reader", "Magic Emperor"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaResult[]>([]);
  const [trendingResults, setTrendingResults] = useState<MangaResult[]>([]);
  const [trendingPage, setTrendingPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState<MangaResult | null>(null);
  const [showChapters, setShowChapters] = useState(false);
  const [statusText, setStatusText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const phaseLabels: Record<SearchPhase, string> = {
    idle: "", connecting: "Establishing secure connections...",
    scanning: "Scanning databases in parallel...",
    analyzing: "Analyzing and cross-referencing data...",
    compiling: "Compiling results...", done: "", error: "",
  };

  const loadTrendingPage = useCallback(async (page: number) => {
    if (page === 1) setLoadingTrending(true); else setLoadingPage(true);
    try {
      const res = await fetch(`/api/trending?page=${page}`);
      if (res.ok) { const data = await res.json(); setTrendingResults(data.results || []); setTrendingPage(data.page || page); setHasMorePages(data.hasMore ?? false); }
    } catch { /* ignore */ } finally { setLoadingTrending(false); setLoadingPage(false); }
  }, []);

  useEffect(() => { loadTrendingPage(1); }, [loadTrendingPage]);

  const goToPage = (page: number) => { window.scrollTo({ top: 0, behavior: "smooth" }); loadTrendingPage(page); };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setResults([]); setSelectedResult(null); setShowChapters(false); setError("");
    setPhase("connecting"); setStatusText(phaseLabels.connecting); await sleep(600);
    setPhase("scanning"); setStatusText(phaseLabels.scanning);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: abortRef.current.signal });
      setPhase("analyzing"); setStatusText(phaseLabels.analyzing); await sleep(400);
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Search failed"); }
      const data = await res.json();
      setPhase("compiling"); setStatusText(phaseLabels.compiling); await sleep(300);
      setResults(data.results || []);
      setPhase("done");
      setStatusText(data.results?.length > 0 ? `Found ${data.results.length} result${data.results.length !== 1 ? "s" : ""} across multiple sources` : "");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setPhase("error"); setError(err instanceof Error ? err.message : "An unexpected error occurred"); setStatusText("");
    }
  }, [query]);

  const searchSample = (sample: string) => { setQuery(sample); setTimeout(() => { const form = document.querySelector("form"); form?.requestSubmit(); }, 50); };
  const clearSearch = () => { setQuery(""); setResults([]); setPhase("idle"); setSelectedResult(null); setError(""); };

  const showHero = results.length === 0 && phase !== "done";
  const isSearching = phase !== "idle" && phase !== "done" && phase !== "error";
  const displayResults = results.length > 0 ? results : (phase === "idle" ? trendingResults : []);
  const showTrendingSection = results.length === 0 && phase === "idle";

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Header ─── */}
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={clearSearch}>
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Manga<span className="text-text-muted">Vault</span></h1>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main navigation">
            <a href="/docs" className="text-xs sm:text-sm text-text-secondary hover:text-white transition-colors">Docs</a>
            <a href="/about" className="text-xs sm:text-sm text-text-secondary hover:text-white transition-colors hidden sm:inline">About</a>
            <a href="/docs" className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-3 py-1.5 hover:bg-bg-hover transition-colors">API</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <div className={`transition-all duration-700 ease-out ${showHero ? "pt-6 sm:pt-10 md:pt-14" : "pt-6 sm:pt-8"}`}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            {/* ─── Hero ─── */}
            <div className={`flex flex-col items-center transition-all duration-700 overflow-hidden ${showHero ? "max-h-[600px] opacity-100 mb-6 sm:mb-8" : "max-h-0 opacity-0 mb-0"}`}>
              <CircleHero />
              {/* Audit #2: Clear product framing */}
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white text-center mt-4 sm:mt-5 max-w-lg leading-snug">
                Search manga, manhwa, anime &amp; webtoons across multiple sources in one place.
              </h2>
              <p className="text-text-muted text-xs sm:text-sm max-w-md mx-auto text-center mt-2">
                A unified discovery engine for fans, plus a fast public API for developers.
              </p>
              {/* Audit #5: Sample query chips */}
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5">
                {SAMPLE_QUERIES.map(s => (
                  <button key={s} onClick={() => searchSample(s)} className="text-[11px] sm:text-xs text-text-secondary bg-bg-card border border-border-subtle rounded-full px-3 py-1 hover:text-white hover:border-border-bright transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Search Bar ─── */}
            <form onSubmit={handleSearch} className="relative" role="search" aria-label="Search manga and manhwa">
              <div className="search-glow rounded-2xl transition-all duration-300 bg-bg-card">
                <div className="flex items-center">
                  <label htmlFor="search-input" className="pl-4 sm:pl-5 pr-2 sm:pr-3 text-text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </label>
                  <input id="search-input" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, genre, or keyword..." className="flex-1 bg-transparent py-4 sm:py-5 text-sm sm:text-base text-white placeholder-text-muted outline-none focus:ring-0" autoFocus />
                  {query && (
                    <button type="button" onClick={clearSearch} className="px-2 text-text-muted hover:text-white transition-colors" aria-label="Clear search">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                  <button type="submit" disabled={!query.trim() || isSearching} className="mr-2 sm:mr-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-black font-medium text-sm rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/40">Search</button>
                </div>
              </div>
            </form>

            {/* Loading */}
            {isSearching && <div className="mt-6 animate-fade-in-up"><LoadingIndicator phase={phase} statusText={statusText} /></div>}
            {/* Error */}
            {phase === "error" && <div className="mt-6 animate-fade-in-up"><div className="glass-card rounded-xl p-4 border border-red-900/30"><p className="text-red-400 text-sm">{error}</p></div></div>}
            {/* Done text */}
            {phase === "done" && results.length > 0 && <p className="text-text-muted text-xs sm:text-sm mt-3 text-center animate-fade-in-up">{statusText}</p>}
            {/* No results — audit #5: empty state with guidance */}
            {phase === "done" && results.length === 0 && (
              <div className="text-center py-10 animate-fade-in-up">
                <p className="text-text-secondary text-sm mb-2">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-text-muted text-xs mb-4">Try an exact title, alternate spelling, or a genre keyword.</p>
                <button onClick={clearSearch} className="text-xs text-white bg-bg-card border border-border-subtle rounded-lg px-4 py-2 hover:border-border-bright transition-colors">Browse trending instead</button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Results / Trending ─── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 pb-12 w-full">
          {showTrendingSection && trendingResults.length > 0 && (
            <div className="flex items-center gap-3 mb-5 animate-fade-in-up">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
              <h3 className="text-xs sm:text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Trending Now
              </h3>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border-subtle to-transparent" />
            </div>
          )}

          {/* Skeleton */}
          {(loadingTrending || loadingPage) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-4 sm:p-5 animate-pulse" aria-hidden="true">
                  <div className="flex gap-4">
                    <div className="w-14 h-20 sm:w-20 sm:h-28 rounded-lg bg-bg-hover flex-shrink-0" />
                    <div className="flex-1 space-y-3"><div className="h-4 bg-bg-hover rounded w-3/4" /><div className="h-3 bg-bg-hover rounded w-full" /><div className="h-3 bg-bg-hover rounded w-2/3" /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
          {!loadingTrending && !loadingPage && displayResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up">
              {displayResults.map((result, idx) => (
                <ResultCard key={`${result.title}-${result.source}-${idx}`} result={result} index={idx} onClick={() => { setSelectedResult(result); setShowChapters(false); }} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {showTrendingSection && !loadingTrending && !loadingPage && trendingResults.length > 0 && (
            <div className="mt-8 animate-fade-in-up"><Pagination currentPage={trendingPage} hasMore={hasMorePages} onPageChange={goToPage} /></div>
          )}
        </div>

        {/* ─── How It Works — audit #4 ─── */}
        {showHero && !loadingTrending && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 w-full animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
              <h3 className="text-xs sm:text-sm font-medium text-text-muted uppercase tracking-wider">How It Works</h3>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border-subtle to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Search", desc: "Type any title, keyword, or genre. We accept exact names, partial matches, and alternate spellings." },
                { step: "2", title: "Aggregate", desc: "Your query runs across multiple databases simultaneously. Results are deduplicated and ranked by relevance." },
                { step: "3", title: "Discover", desc: "View details, ratings, chapters, and cover art. Click through to read on the original source." },
              ].map(s => (
                <div key={s.step} className="glass-card rounded-xl p-4 sm:p-5">
                  <span className="text-xs font-bold text-text-muted bg-bg-hover rounded-full w-6 h-6 flex items-center justify-center mb-3">{s.step}</span>
                  <h4 className="text-sm font-semibold text-white mb-1">{s.title}</h4>
                  <p className="text-text-muted text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedResult && <DetailModal result={selectedResult} showChapters={showChapters} onToggleChapters={() => setShowChapters(!showChapters)} onClose={() => { setSelectedResult(null); setShowChapters(false); }} />}

      {/* ─── Footer — audit #6 ─── */}
      <footer className="border-t border-border-subtle py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-white flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <span className="text-text-muted text-xs">MangaVault · v1.0.0 · Public Beta</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs text-text-muted">
              <a href="/docs" className="hover:text-white transition-colors">API Docs</a>
              <a href="/about" className="hover:text-white transition-colors">About</a>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Operational</span>
            </div>
          </div>
          <p className="text-text-muted/50 text-[10px] text-center mt-4">© {new Date().getFullYear()} MangaVault. Not affiliated with any content source. All data is publicly available and aggregated for discovery purposes.</p>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════ PAGINATION ═══════════════════ */
function Pagination({ currentPage, hasMore, onPageChange }: { currentPage: number; hasMore: boolean; onPageChange: (p: number) => void }) {
  const totalPages = 17;
  const getVisiblePages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); return pages; }
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border-subtle bg-bg-card text-text-secondary text-xs sm:text-sm hover:bg-bg-hover hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-white/20">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg><span className="hidden sm:inline">Prev</span>
      </button>
      {getVisiblePages().map((p, i) => p === "..." ? (
        <span key={`dots-${i}`} className="px-1.5 py-2 text-text-muted text-xs">…</span>
      ) : (
        <button key={p} onClick={() => onPageChange(p)} aria-label={`Page ${p}`} aria-current={p === currentPage ? "page" : undefined} className={`min-w-[36px] sm:min-w-[40px] h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white/20 ${p === currentPage ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.15)]" : "border border-border-subtle bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-white"}`}>{p}</button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={!hasMore} aria-label="Next page" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border-subtle bg-bg-card text-text-secondary text-xs sm:text-sm hover:bg-bg-hover hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-white/20">
        <span className="hidden sm:inline">Next</span><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}

/* ═══════════════════ CIRCULAR HERO ═══════════════════ */
function CircleHero() {
  const circleText = "MANGA · MANHWA · ANIME · DONGHUA · MANHUA · WEBTOON · ";
  return (
    <div className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64" aria-hidden="true">
      <div className="absolute inset-0 rounded-full opacity-20 blur-xl bg-gradient-to-br from-white/20 to-transparent" />
      <div className="absolute inset-2 sm:inset-3 rounded-full border border-white/[0.06]" /><div className="absolute inset-4 sm:inset-6 rounded-full border border-white/[0.04]" />
      <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 300 300"><defs><path id="circlePath" d="M 150,150 m -120,0 a 120,120 0 1,1 240,0 a 120,120 0 1,1 -240,0" /></defs><text className="fill-white/50" style={{ fontSize: "13px", letterSpacing: "5px", fontWeight: 600, fontFamily: "system-ui, sans-serif" }}><textPath href="#circlePath" startOffset="0%">{circleText}</textPath></text></svg>
      <svg className="absolute inset-0 w-full h-full animate-spin-slow-reverse" viewBox="0 0 300 300"><defs><path id="innerCirclePath" d="M 150,150 m -75,0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0" /></defs><text className="fill-white/20" style={{ fontSize: "9px", letterSpacing: "3px", fontWeight: 400, fontFamily: "system-ui, sans-serif" }}><textPath href="#innerCirclePath" startOffset="0%">MANGA · MANHWA · ANIME · DONGHUA · MANHUA · WEBTOON · </textPath></text></svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="w-1 h-1 rounded-full bg-white/50 mb-2 sm:mb-3" /><span className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">Search</span><div className="w-8 sm:w-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mt-2 sm:mt-3" /></div>
    </div>
  );
}

/* ═══════════════════ LOADING ═══════════════════ */
function LoadingIndicator({ phase, statusText }: { phase: SearchPhase; statusText: string }) {
  const steps = [
    { key: "connecting", label: "Connecting", desc: "Establishing secure connections to sources..." },
    { key: "scanning", label: "Scanning", desc: "Querying multiple databases in parallel..." },
    { key: "analyzing", label: "Analyzing", desc: "Cross-referencing and deduplicating results..." },
    { key: "compiling", label: "Compiling", desc: "Ranking and assembling final results..." },
  ] as const;
  const currentIdx = steps.findIndex((s) => s.key === phase);
  return (
    <div className="glass-card rounded-xl p-5 sm:p-6" role="status" aria-live="polite">
      <div className="flex flex-col gap-0">
        {steps.map((step, idx) => {
          const done = idx < currentIdx, active = idx === currentIdx, pending = idx > currentIdx;
          return (
            <div key={step.key} className="flex items-stretch gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <div className={`relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-500 flex-shrink-0 ${done ? "border-green-500 bg-green-500" : active ? "border-green-400 bg-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.4)]" : "border-border-bright bg-bg-card"}`}>
                  {done ? <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : active ? <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" /> : <div className="w-2 h-2 rounded-full bg-border-bright" />}
                </div>
                {idx < steps.length - 1 && <div className="w-0.5 flex-1 min-h-6 my-0.5 rounded-full" style={{ background: done ? "#22c55e" : active ? "linear-gradient(to bottom, #22c55e, #222)" : "#222" }} />}
              </div>
              <div className={`pb-5 ${idx === steps.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold transition-colors ${done ? "text-green-400" : active ? "text-white" : "text-text-muted"}`}>{step.label}</h4>
                  {done && <span className="text-[10px] font-medium text-green-500/80 bg-green-500/10 px-1.5 py-0.5 rounded-full leading-none">Done</span>}
                  {active && <span className="text-[10px] font-medium text-green-400/80 bg-green-500/10 px-1.5 py-0.5 rounded-full leading-none animate-pulse">In Progress</span>}
                </div>
                <p className={`text-xs mt-0.5 ${active ? "text-text-secondary" : pending ? "text-text-muted/50" : "text-text-muted"}`}>{step.desc}</p>
                {active && <div className="flex items-center gap-2 mt-2"><div className="dot-loading-green flex gap-1"><span /><span /><span /></div><p className="text-xs text-green-400/70">{statusText}</p></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════ RESULT CARD ═══════════════════ */
function ResultCard({ result, index, onClick }: { result: MangaResult; index: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="glass-card rounded-xl p-3 sm:p-4 md:p-5 text-left transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] group cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-1 focus:ring-offset-bg-primary" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex gap-3 sm:gap-4">
        {result.coverUrl ? (
          <div className="w-14 h-20 sm:w-16 sm:h-22 md:w-20 md:h-28 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover"><img src={result.coverUrl} alt={`Cover of ${result.title}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /></div>
        ) : (
          <div className="w-14 h-20 sm:w-16 sm:h-22 md:w-20 md:h-28 rounded-lg bg-bg-hover flex-shrink-0 flex items-center justify-center"><svg className="w-6 h-6 sm:w-8 sm:h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-sm sm:text-base text-white truncate group-hover:text-gray-200 transition-colors">{result.title}</h3>
          <p className="text-text-muted text-[11px] sm:text-xs mt-1 line-clamp-2">{result.description.substring(0, 120)}{result.description.length > 120 ? "..." : ""}</p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            {result.rating !== "N/A" && <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded-md"><svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{result.rating}</span>}
            {result.chapterCount !== "0" && <span className="text-xs text-text-muted">{result.chapterCount} chs</span>}
            <span className={`text-xs px-2 py-0.5 rounded-md ${result.status.toLowerCase() === "completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>{result.status}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════ DETAIL MODAL ═══════════════════ */
function DetailModal({ result, showChapters, onToggleChapters, onClose }: { result: MangaResult; showChapters: boolean; onToggleChapters: () => void; onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={result.title}>
      <div className="w-full sm:max-w-2xl max-h-[90vh] bg-bg-secondary border border-border-subtle rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up flex flex-col">
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border-subtle">
          <div className="flex gap-4 flex-1 min-w-0">
            {result.coverUrl ? <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover"><img src={result.coverUrl} alt="" className="w-full h-full object-cover" /></div> : <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg bg-bg-card flex-shrink-0 flex items-center justify-center"><svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{result.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.rating !== "N/A" && <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-md"><svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{result.rating}</span>}
                <span className={`text-xs px-2 py-1 rounded-md ${result.status.toLowerCase() === "completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>{result.status}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-text-secondary">{result.type}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ml-3 p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-white flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/20" aria-label="Close"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <MetaItem label="Author" value={result.author} /><MetaItem label="Artist" value={result.artist} />
            <MetaItem label="Chapters" value={result.chapterCount} /><MetaItem label="Source" value={result.source} />
          </div>
          {result.genres.length > 0 && <div><h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Genres</h4><div className="flex flex-wrap gap-1.5">{result.genres.map(g => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-text-secondary border border-border-subtle">{g}</span>)}</div></div>}
          <div><h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Description</h4><p className="text-sm text-text-secondary leading-relaxed">{result.description}</p></div>
          {result.chapters.length > 0 && (
            <div>
              <button onClick={onToggleChapters} className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-bg-card border border-border-subtle hover:border-border-bright transition-all focus:outline-none focus:ring-2 focus:ring-white/20">
                <span className="text-sm font-medium text-white">Chapters ({result.chapters.length})</span>
                <svg className={`w-4 h-4 text-text-muted transition-transform duration-200 ${showChapters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showChapters && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle">
                  {result.chapters.map((ch, idx) => (
                    <a key={idx} href={ch.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-hover transition-colors group">
                      <span className="text-sm text-text-secondary group-hover:text-white transition-colors truncate">{ch.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">{ch.date && <span className="text-xs text-text-muted">{ch.date}</span>}<svg className="w-3.5 h-3.5 text-text-muted group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">Visit Source →</a>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (<div className="bg-bg-card rounded-lg p-3 border border-border-subtle"><p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p><p className="text-sm text-text-primary truncate">{value || "Unknown"}</p></div>);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
