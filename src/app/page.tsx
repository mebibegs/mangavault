"use client";

import { Fragment, useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ShaderBackground = dynamic(() => import("@/components/ShaderBackground"), { ssr: false });
const InkReveal = dynamic(() => import("@/components/InkReveal"), { ssr: false });
const OrbitalLoader = dynamic(() => import("@/components/OrbitalLoader"), { ssr: false });

interface ChapterInfo { title: string; url: string; date: string; }
interface MangaResult {
  title: string; description: string; rating: string; status: string;
  type: string; genres: string[]; chapters: ChapterInfo[];
  chapterCount: string; coverUrl: string; url: string;
  source: string; author: string; artist: string;
}

type SearchPhase = "idle" | "connecting" | "scanning" | "analyzing" | "compiling" | "done" | "error";

const SAMPLE_QUERIES: { title: string; type: string }[] = [
  { title: "Solo Leveling", type: "Manhwa" },
  { title: "One Piece", type: "Manga" },
  { title: "Tower of God", type: "Manhwa" },
  { title: "Omniscient Reader", type: "Manhwa" },
  { title: "Magic Emperor", type: "Manhua" },
];

const PHASE_MESSAGES: Record<string, string> = {
  connecting: "Connecting to sources...",
  scanning: "Scanning databases in parallel...",
  analyzing: "Deduplicating and ranking...",
  compiling: "Assembling results...",
};

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

  const loadTrendingPage = useCallback(async (page: number) => {
    if (page === 1) setLoadingTrending(true); else setLoadingPage(true);
    try { const res = await fetch(`/api/trending?page=${page}`); if (res.ok) { const d = await res.json(); setTrendingResults(d.results || []); setTrendingPage(d.page || page); setHasMorePages(d.hasMore ?? false); } } catch { /* */ } finally { setLoadingTrending(false); setLoadingPage(false); }
  }, []);

  useEffect(() => { loadTrendingPage(1); }, [loadTrendingPage]);
  const goToPage = (p: number) => { window.scrollTo({ top: 0, behavior: "smooth" }); loadTrendingPage(p); };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setResults([]); setSelectedResult(null); setShowChapters(false); setError("");
    setPhase("connecting"); setStatusText(PHASE_MESSAGES.connecting); await sleep(500);
    setPhase("scanning"); setStatusText(PHASE_MESSAGES.scanning);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: abortRef.current.signal });
      setPhase("analyzing"); setStatusText(PHASE_MESSAGES.analyzing); await sleep(300);
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Search failed"); }
      const d = await res.json();
      setPhase("compiling"); setStatusText(PHASE_MESSAGES.compiling); await sleep(200);
      setResults(d.results || []); setPhase("done");
      setStatusText(d.results?.length > 0 ? `Found ${d.results.length} result${d.results.length !== 1 ? "s" : ""} across multiple sources` : "");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setPhase("error"); setError(err instanceof Error ? err.message : "An unexpected error occurred"); setStatusText("");
    }
  }, [query]);

  const searchSample = (s: string) => { setQuery(s); setTimeout(() => document.querySelector("form")?.requestSubmit(), 50); };
  const clearSearch = () => { setQuery(""); setResults([]); setPhase("idle"); setSelectedResult(null); setError(""); };

  const showHero = results.length === 0 && phase !== "done";
  const isSearching = phase !== "idle" && phase !== "done" && phase !== "error";
  const displayResults = results.length > 0 ? results : (phase === "idle" ? trendingResults : []);
  const showTrending = results.length === 0 && phase === "idle";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={clearSearch} role="link" tabIndex={0} onKeyDown={e => e.key === "Enter" && clearSearch()}>
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">Manga<span className="text-text-muted">Vault</span></span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-4" aria-label="Main">
            <a href="/docs" className="text-xs sm:text-sm text-text-secondary hover:text-white transition-colors cursor-pointer">Docs</a>
            <a href="/about" className="text-xs sm:text-sm text-text-secondary hover:text-white transition-colors cursor-pointer">About</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* ─── Hero with Shader Background ─── */}
        <div className={`relative transition-all duration-700 ease-out ${showHero ? "pt-0" : "pt-6 sm:pt-8"}`}>
          {showHero && (
            <div className="absolute inset-0 overflow-hidden" style={{ height: "100%", maxHeight: "520px" }}>
              <ShaderBackground />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-primary" style={{ zIndex: 1 }} />
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4 sm:px-6 relative" style={{ zIndex: 2 }}>
            {/* Hero content */}
            <div className={`flex flex-col items-center transition-all duration-700 overflow-hidden ${showHero ? "max-h-[600px] opacity-100 mb-6 sm:mb-8 pt-10 sm:pt-16 md:pt-20" : "max-h-0 opacity-0 mb-0"}`}>
              <p className="text-white/40 text-[11px] sm:text-xs tracking-[0.25em] uppercase mb-4 sm:mb-5">
                Manga · Manhwa · Manhua · Anime · Donghua · Webtoon
              </p>
              <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-white text-center leading-snug max-w-xl drop-shadow-lg">
                One search. Every{" "}
                <span className="inline-block h-[1.2em] overflow-hidden relative align-bottom words-slot">
                  <span className="word-roll text-[#956afa]">Manga</span>
                  <span className="word-roll text-[#956afa]">Manhwa</span>
                  <span className="word-roll text-[#956afa]">Manhua</span>
                  <span className="word-roll text-[#956afa]">Anime</span>
                  <span className="word-roll text-[#956afa]">Webtoon</span>
                  <span className="word-roll text-[#956afa]">Donghua</span>
                  <span className="word-roll text-[#956afa]">Manga</span>
                </span>{" "}
                source.
              </h2>
              <p className="text-white/60 text-xs sm:text-sm max-w-lg mx-auto text-center mt-3 leading-relaxed">
                Type a title once and MangaVault checks multiple databases in parallel — then merges the results into a single ranked, deduplicated list with covers, ratings, and chapter counts.
              </p>
            </div>

            {/* ─── Animated Search Bar ─── */}
            <form onSubmit={handleSearch} className="relative" role="search" aria-label="Search manga and manhwa">
              <div className="relative flex items-center justify-center group">
                {/* Glow layers */}
                <div className="absolute z-0 overflow-hidden h-full w-full rounded-2xl blur-[3px] before:absolute before:content-[''] before:z-[-1] before:w-[800px] before:h-[800px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg] before:bg-[conic-gradient(#000,#402fb5_5%,#000_38%,#000_50%,#cf30aa_60%,#000_87%)] before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]" />
                <div className="absolute z-0 overflow-hidden h-full w-full rounded-2xl blur-[2px] before:absolute before:content-[''] before:z-[-1] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg] before:bg-[conic-gradient(rgba(0,0,0,0),#18116a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#6e1b60,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]" />
                <div className="absolute z-0 overflow-hidden h-full w-full rounded-2xl blur-[0.5px] before:absolute before:content-[''] before:z-[-1] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg] before:bg-[conic-gradient(#09090b,#402fb5_5%,#09090b_14%,#09090b_50%,#cf30aa_60%,#09090b_64%)] before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]" />

                {/* Input container */}
                <div className="relative z-10 w-full bg-[#0a0a0e] rounded-2xl flex items-center">
                  <label htmlFor="search-input" className="pl-4 sm:pl-5 pr-2 sm:pr-3 text-text-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="20" fill="none">
                      <circle stroke="url(#sg)" r="8" cy="11" cx="11" /><line stroke="url(#sl)" y2="16.65" y1="22" x2="16.65" x1="22" />
                      <defs><linearGradient gradientTransform="rotate(50)" id="sg"><stop stopColor="#f8e7f8" offset="0%" /><stop stopColor="#b6a9b7" offset="50%" /></linearGradient><linearGradient id="sl"><stop stopColor="#b6a9b7" offset="0%" /><stop stopColor="#837484" offset="50%" /></linearGradient></defs>
                    </svg>
                  </label>
                  <input id="search-input" type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for a title — e.g. Solo Leveling, Tower of God" className="flex-1 bg-transparent py-4 sm:py-5 text-sm sm:text-base text-white placeholder-text-muted outline-none" autoFocus />
                  {query && (
                    <button type="button" onClick={clearSearch} className="px-2 text-text-muted hover:text-white transition-colors cursor-pointer focus:outline-none" aria-label="Clear"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  )}
                  <button type="submit" disabled={!query.trim() || isSearching} className="mr-2 sm:mr-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-black font-medium text-sm rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40">Search</button>
                </div>
              </div>
            </form>

            {/* Sample queries */}
            {showHero && (
              <div className="mt-4 sm:mt-5 animate-fade-in-up relative" style={{ zIndex: 2 }}>
                <p className="text-text-muted text-[11px] uppercase tracking-wider mb-2 text-center">Try a search</p>
                <div className="flex flex-wrap justify-center gap-2 stagger-children">
                  {SAMPLE_QUERIES.map(s => (
                    <button key={s.title} onClick={() => searchSample(s.title)} className="flex items-center gap-2 text-xs bg-bg-card border border-border-subtle rounded-lg px-3 py-2 hover:border-border-bright hover:text-white text-text-secondary transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 hover:translate-y-[-1px]">
                      <span className="font-medium text-white">{s.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted">{s.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Orbital loader */}
            {isSearching && (
              <div className="mt-8 mb-4 animate-fade-in-up">
                <OrbitalLoader message={statusText} />
              </div>
            )}

            {phase === "error" && <div className="mt-6 animate-fade-in-up"><div className="glass-card rounded-xl p-4 border border-red-900/30"><p className="text-red-400 text-sm">{error}</p></div></div>}
            {phase === "done" && results.length > 0 && <p className="text-text-muted text-xs sm:text-sm mt-3 text-center animate-fade-in-up">{statusText}</p>}
            {phase === "done" && results.length === 0 && (
              <div className="text-center py-10 animate-fade-in-up">
                <p className="text-text-secondary text-sm mb-2">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-text-muted text-xs mb-4">Try an exact title, an alternate spelling, or a shorter keyword.</p>
                <button onClick={clearSearch} className="text-xs text-white bg-bg-card border border-border-subtle rounded-lg px-4 py-2 hover:border-border-bright transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20">Browse trending instead</button>
              </div>
            )}
          </div>
        </div>

        {/* Ink Reveal overlay between hero and trending */}
        {showTrending && trendingResults.length > 0 && (
          <div className="relative w-full" style={{ height: "120px" }}>
            <InkReveal />
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
              <div className="flex items-center gap-3">
                <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-border-subtle" />
                <h3 className="text-xs sm:text-sm font-medium text-text-muted uppercase tracking-wider">Trending Now</h3>
                <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-border-subtle" />
              </div>
            </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-2 sm:mt-4 pb-12 w-full">
          {(loadingTrending || loadingPage) && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse" aria-hidden="true">
                  <div className="aspect-[3/4] bg-bg-hover" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-bg-hover rounded w-3/4" />
                    <div className="h-3 bg-bg-hover rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingTrending && !loadingPage && displayResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 stagger-children">
              {displayResults.map((result, idx) => (
                <Fragment key={`${result.title}-${result.source}-${idx}`}>
                  <ResultCard result={result} onClick={() => { setSelectedResult(result); setShowChapters(false); }} />
                  {showTrending && showHero && idx === 1 && (
                    <div className="col-span-full">
                      <FeaturedBanner compact={false} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          )}

          {showTrending && !loadingTrending && !loadingPage && trendingResults.length > 0 && (
            <div className="mt-8 animate-fade-in-up"><TrendingPagination currentPage={trendingPage} hasMore={hasMorePages} onPageChange={goToPage} /></div>
          )}
        </div>


      </main>

      {selectedResult && <DetailModal result={selectedResult} showChapters={showChapters} onToggleChapters={() => setShowChapters(!showChapters)} onClose={() => { setSelectedResult(null); setShowChapters(false); }} />}

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault · v1.0.0 · Public Beta</span>
          <div className="flex items-center gap-4">
            <a href="/docs" className="hover:text-white transition-colors cursor-pointer">Docs</a>
            <a href="/about" className="hover:text-white transition-colors cursor-pointer">About</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════ PAGINATION ═══════════════════ */
function TrendingPagination({ currentPage, hasMore, onPageChange }: { currentPage: number; hasMore: boolean; onPageChange: (p: number) => void }) {
  const total = 17;

  const visiblePages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(total - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          />
        </PaginationItem>

        {visiblePages().map((page, i) =>
          page === "..." ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasMore}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

/* ═══════════════════ RESULT CARD (Vertical Poster) ═══════════════════ */
function ResultCard({ result, onClick }: { result: MangaResult; onClick: () => void }) {
  const statusLower = result.status.toLowerCase();
  const statusColor =
    statusLower === "completed" || statusLower === "finished"
      ? "bg-red-500/90 text-white"
      : statusLower === "ongoing"
        ? "bg-green-500/90 text-white"
        : "bg-yellow-500/90 text-black";

  const firstGenre = result.genres.length > 0 ? result.genres[0] : result.type;

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl overflow-hidden text-left transition-all duration-200 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-white/5 group cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-1 focus:ring-offset-bg-primary flex flex-col"
    >
      {/* ── Cover poster ── */}
      <div className="relative aspect-[3/4] bg-bg-hover overflow-hidden">
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={`Cover of ${result.title}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-card">
            <svg className="w-10 h-10 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* Status badge — top-left corner */}
        <span className={`absolute top-2 left-2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md shadow-md ${statusColor}`}>
          {result.status}
        </span>

        {/* Gradient overlay at the bottom of poster for readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* ── Info section ── */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug group-hover:text-gray-200 transition-colors">
          {result.title}
        </h3>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-xs sm:text-sm font-semibold text-text-secondary truncate">
            {firstGenre}
          </span>
          {result.rating !== "N/A" && (
            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-text-primary flex-shrink-0">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {result.rating}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════ DETAIL MODAL ═══════════════════ */
function DetailModal({ result, showChapters, onToggleChapters, onClose }: { result: MangaResult; showChapters: boolean; onToggleChapters: () => void; onClose: () => void }) {
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerImages, setReaderImages] = useState<string[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState("");
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  // Show Prev/Next buttons only when user scrolls near the end
  useEffect(() => {
    const container = readerScrollRef.current;
    if (!container || readerImages.length === 0) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show when within 600px of the bottom
      const nearBottom = scrollHeight - scrollTop - clientHeight < 600;
      setShowNavButtons(nearBottom);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    // Check once on mount in case content is short enough to already be at the bottom
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [readerImages]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (readerUrl) setReaderUrl(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, readerUrl]);

  const totalChapters = parseInt(result.chapterCount) || result.chapters.length;

  const getChapterNumber = (chapter: ChapterInfo): number | null => {
    const title = chapter.title || "";
    const url = chapter.url || "";

    const titleMatch = title.match(/(?:chapter|ch\.?|ep\.?|episode)\s*([\d.]+)/i);
    if (titleMatch) return parseFloat(titleMatch[1]);

    const urlMatch = url.match(/[?&]chapter=([\d.]+)/i) || url.match(/chapter[-_/]([\d.]+)/i);
    if (urlMatch) return parseFloat(urlMatch[1]);

    if (/read first/i.test(title)) return 0;

    const fallback = title.match(/([\d.]+)/);
    return fallback ? parseFloat(fallback[1]) : null;
  };

  const openReader = async (chUrl: string, chapterIndex?: number) => {
    if (typeof chapterIndex === "number") setCurrentChapterIndex(chapterIndex);
    setReaderUrl(chUrl);
    setReaderLoading(true);
    setReaderError("");
    setReaderImages([]);
    setShowNavButtons(false);
    // Scroll the reader container back to top for the new chapter
    if (readerScrollRef.current) readerScrollRef.current.scrollTop = 0;
    try {
      const res = await fetch(`/api/reader?url=${encodeURIComponent(chUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (data.images && data.images.length > 0) {
        setReaderImages(data.images);
      } else {
        setReaderError("No images found for this chapter.");
      }
    } catch (err) {
      setReaderError(err instanceof Error ? err.message : "Failed to load chapter");
    } finally {
      setReaderLoading(false);
    }
  };

  const hasRealChapterList = result.chapters.length > 0;

  const currentChapter = hasRealChapterList && currentChapterIndex !== null
    ? result.chapters[currentChapterIndex] ?? null
    : null;
  const currentChapterNumber = currentChapter ? getChapterNumber(currentChapter) : null;

  const chapterEntries = hasRealChapterList
    ? result.chapters
        .map((chapter, index) => ({ chapter, index, number: getChapterNumber(chapter) }))
        .filter((entry) => entry.number !== null)
    : [];

  const prevEntry = currentChapterNumber === null
    ? null
    : chapterEntries
        .filter((entry) => (entry.number as number) < currentChapterNumber)
        .sort((a, b) => (b.number as number) - (a.number as number))[0] ?? null;

  const nextEntry = currentChapterNumber === null
    ? null
    : chapterEntries
        .filter((entry) => (entry.number as number) > currentChapterNumber)
        .sort((a, b) => (a.number as number) - (b.number as number))[0] ?? null;

  const canGoPrev = Boolean(prevEntry);
  const canGoNext = Boolean(nextEntry);

  const goPrevChapter = () => {
    if (!prevEntry) return;
    openReader(prevEntry.chapter.url, prevEntry.index);
  };

  const goNextChapter = () => {
    if (!nextEntry) return;
    openReader(nextEntry.chapter.url, nextEntry.index);
  };

  // ─── Image Reader view ───
  if (readerUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-bg-secondary border-b border-border-subtle flex-shrink-0">
          <button onClick={() => { setReaderUrl(null); setReaderImages([]); setReaderError(""); setCurrentChapterIndex(null); }} className="flex items-center gap-2 text-xs sm:text-sm text-text-secondary hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg px-3 py-1.5 bg-bg-card border border-border-subtle hover:border-border-bright">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h3 className="text-xs sm:text-sm text-white font-medium truncate max-w-[40%] sm:max-w-[50%]">{result.title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-white/20" aria-label="Close reader">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Loading */}
        {readerLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-[orbital-spin_1s_linear_infinite]" />
                <div className="absolute inset-2 border-2 border-transparent border-t-white/50 rounded-full animate-[orbital-spin-reverse_1.5s_linear_infinite]" />
              </div>
              <p className="text-text-muted text-xs">Extracting images...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {readerError && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">{readerError}</p>
              <button onClick={() => { setReaderUrl(null); setReaderError(""); }} className="neu-button">Back to chapters</button>
            </div>
          </div>
        )}

        {/* Images */}
        {!readerLoading && !readerError && readerImages.length > 0 && (
          <>
            {/* Edge-mounted chapter navigation — only visible near the end */}
            {hasRealChapterList && canGoPrev && showNavButtons && (
              <div className="fixed left-3 sm:left-5 bottom-5 sm:bottom-6 z-20 animate-fade-in-up">
                <button onClick={goPrevChapter} className="chapter-nav-btn">
                  <span className="chapter-nav-blob" />
                  <span className="chapter-nav-inner">Previous</span>
                </button>
              </div>
            )}
            {hasRealChapterList && canGoNext && showNavButtons && (
              <div className="fixed right-3 sm:right-5 bottom-5 sm:bottom-6 z-20 animate-fade-in-up">
                <button onClick={goNextChapter} className="chapter-nav-btn">
                  <span className="chapter-nav-blob" />
                  <span className="chapter-nav-inner">Next</span>
                </button>
              </div>
            )}

            <div ref={readerScrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto flex flex-col items-center">
                {readerImages.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Page ${i + 1}`}
                    className="w-full h-auto select-none"
                    loading={i < 3 ? "eager" : "lazy"}
                    referrerPolicy="no-referrer"
                    draggable={false}
                  />
                ))}
                <div className="py-8 px-4 text-center space-y-5">
                  <p className="text-text-muted text-xs">End of chapter</p>
                  <button onClick={() => { setReaderUrl(null); setReaderImages([]); setCurrentChapterIndex(null); }} className="neu-button">Back to chapters</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* No images found */}
        {!readerLoading && !readerError && readerImages.length === 0 && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <p className="text-text-muted text-sm mb-3">No images could be extracted from this chapter.</p>
              <a href={readerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-white underline cursor-pointer">Open on source site instead →</a>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Detail view ───
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={result.title}>
      <div className="w-full sm:max-w-2xl max-h-[90vh] bg-bg-secondary border border-border-subtle rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up flex flex-col">
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border-subtle">
          <div className="flex gap-4 flex-1 min-w-0">
            {result.coverUrl ? <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover"><img src={result.coverUrl} alt="" className="w-full h-full object-cover" /></div> : <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg bg-bg-card flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{result.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.rating !== "N/A" && <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-md"><svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{result.rating}</span>}
                <span className={`text-xs px-2 py-1 rounded-md ${result.status.toLowerCase() === "completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>{result.status}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-text-secondary">{result.type}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ml-3 p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20" aria-label="Close"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3"><MI l="Author" v={result.author} /><MI l="Artist" v={result.artist} /><MI l="Total Chapters" v={String(totalChapters)} /><MI l="Source" v={result.source} /></div>
          {result.genres.length > 0 && <div><h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Genres</h4><div className="flex flex-wrap gap-1.5">{result.genres.map(g => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-text-secondary border border-border-subtle">{g}</span>)}</div></div>}
          <div><h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Description</h4><p className="text-sm text-text-secondary leading-relaxed">{result.description}</p></div>

          {/* Chapters */}
          <div>
            <button onClick={onToggleChapters} className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-bg-card border border-border-subtle hover:border-border-bright transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20">
              <span className="text-sm font-medium text-white">All Chapters ({totalChapters})</span>
              <svg className={`w-4 h-4 text-text-muted transition-transform duration-200 ${showChapters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {showChapters && (
              <div className="mt-2 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle" style={{ maxHeight: "50vh" }}>
                {result.chapters.length > 0 ? (
                  result.chapters.map((ch, i) => (
                    <button key={i} onClick={() => openReader(ch.url, i)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                      <span className="min-w-0 flex-1 text-sm text-green-400 font-medium truncate">
                        {ch.title}
                      </span>
                      <span className="flex-shrink-0 text-right whitespace-nowrap text-xs font-medium text-red-400">
                        {ch.date || "—"}
                      </span>
                    </button>
                  ))
                ) : (
                  Array.from({ length: totalChapters }, (_, i) => (
                    <button key={i} onClick={() => openReader(result.url)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                      <span className="min-w-0 flex-1 text-sm text-green-400 font-medium truncate">Chapter {totalChapters - i}</span>
                      <span className="flex-shrink-0 text-right whitespace-nowrap text-xs font-medium text-red-400">—</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MI({ l, v }: { l: string; v: string }) {
  return <div className="bg-bg-card rounded-lg p-3 border border-border-subtle"><p className="text-xs text-text-muted uppercase tracking-wider mb-1">{l}</p><p className="text-sm text-text-primary truncate">{v || "Unknown"}</p></div>;
}

function StudioLogo({ name, font, accent, sub }: { name: string; font: string; accent?: boolean; sub?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`${font} text-sm sm:text-lg md:text-xl leading-none select-none drop-shadow-lg ${
          accent
            ? "bg-red-600 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-sm"
            : "text-white"
        }`}
      >
        {name}
      </span>
      {sub && (
        <span className="text-white font-semibold text-[7px] sm:text-[9px] md:text-[10px] tracking-[0.25em] uppercase mt-0.5 select-none">
          {sub}
        </span>
      )}
    </div>
  );
}

function FeaturedBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative w-full overflow-hidden mx-auto max-w-7xl">
      <div className={`relative w-full ${compact ? "aspect-[21/10] sm:aspect-[21/9]" : "aspect-[21/9] sm:aspect-[21/8] md:aspect-[21/7]"}`}>
        <img
          src="/images/spiderman-banner.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-[6px] scale-105"
          loading="lazy"
          draggable={false}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-bg-primary/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />

        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center z-10 ${compact ? "px-4 py-5" : "px-6 py-6"}`}>
          <h3 className={`text-white font-extrabold tracking-wide drop-shadow-lg ${compact ? "text-base sm:text-xl mb-4" : "text-lg sm:text-2xl md:text-3xl mb-5 sm:mb-7"}`}>
            Now on MangaVault
          </h3>

          <div className={`flex items-center justify-center flex-wrap ${compact ? "gap-3 sm:gap-5 mb-3" : "gap-5 sm:gap-8 md:gap-12 mb-4 sm:mb-6"}`}>
            <StudioLogo name="Disney" font="font-serif italic" />
            <StudioLogo name="MARVEL" font="font-bold tracking-wider" accent />
            <StudioLogo name="STAR WARS" font="font-extrabold tracking-[0.15em]" />
            <StudioLogo name="20th CENTURY" font="font-bold tracking-wide" sub="STUDIOS" />
          </div>

          <p className={`text-white font-bold uppercase tracking-[0.2em] drop-shadow-md ${compact ? "text-[10px] sm:text-xs mb-1.5" : "text-xs sm:text-sm md:text-base mb-2 sm:mb-3"}`}>
            Now ALL on MangaVault
          </p>

          <p className={`text-white/40 leading-relaxed max-w-lg ${compact ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-[10px] md:text-xs"}`}>
            Disney, Marvel, Star Wars, and 20th Century Studios are registered trademarks of The Walt Disney Company. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
