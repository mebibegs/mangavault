"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import dynamic from "next/dynamic";

// Lazy load heavy components - ShaderBackground is extremely heavy on main thread
const ShaderBackground = dynamic(() => import("@/components/ShaderBackground"), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-bg-primary to-bg-primary" />
});

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
];

const PHASE_MESSAGES: Record<string, string> = {
  connecting: "Connecting to sources...",
  scanning: "Scanning databases in parallel...",
  analyzing: "Deduplicating and ranking...",
  compiling: "Assembling results...",
};

// Limit initial cards to reduce DOM size and improve performance
const MAX_TRENDING_CARDS = 20;
const MAX_GENRE_CARDS = 15;

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MangaResult[]>([]);
  const [trendingResults, setTrendingResults] = useState<MangaResult[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState<MangaResult | null>(null);
  const [showChapters, setShowChapters] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [shaderEnabled, setShaderEnabled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Delay shader loading to prioritize content
  useEffect(() => {
    const timer = setTimeout(() => setShaderEnabled(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trending?page=1");
        if (res.ok) { 
          const d = await res.json(); 
          // Limit results to reduce DOM size
          setTrendingResults((d.results || []).slice(0, MAX_TRENDING_CARDS)); 
        }
      } catch { /* */ }
      finally { setLoadingTrending(false); }
    })();
  }, []);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setResults([]); setSelectedResult(null); setShowChapters(false); setError("");
    setPhase("connecting"); setStatusText(PHASE_MESSAGES.connecting); await sleep(300);
    setPhase("scanning"); setStatusText(PHASE_MESSAGES.scanning);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: abortRef.current.signal });
      setPhase("analyzing"); setStatusText(PHASE_MESSAGES.analyzing); await sleep(200);
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Search failed"); }
      const d = await res.json();
      setPhase("compiling"); setStatusText(PHASE_MESSAGES.compiling); await sleep(100);
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
            <span className="text-lg sm:text-xl font-bold tracking-tight">Manga<span className="text-gray-400">Vault</span></span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-4" aria-label="Main">
            <a href="/docs" className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors cursor-pointer">Docs</a>
            <a href="/about" className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors cursor-pointer">About</a>
            <a href="/adult" className="text-[10px] sm:text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer font-bold border border-red-500/30 rounded-md px-2 py-1 hover:border-red-500/50">18+</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* ─── Hero with Shader Background ─── */}
        <div className={`relative transition-all duration-700 ease-out ${showHero ? "pt-0" : "pt-6 sm:pt-8"}`}>
          {showHero && (
            <div className="absolute inset-0 overflow-hidden" style={{ height: "100%", maxHeight: "520px" }}>
              {/* Only load shader after delay to prioritize content */}
              {shaderEnabled ? (
                <ShaderBackground />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-bg-primary to-bg-primary" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-primary" style={{ zIndex: 1 }} />
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4 sm:px-6 relative" style={{ zIndex: 2 }}>
            {/* Hero content */}
            <div className={`flex flex-col items-center transition-all duration-700 overflow-hidden ${showHero ? "max-h-[600px] opacity-100 mb-6 sm:mb-8 pt-10 sm:pt-16 md:pt-20" : "max-h-0 opacity-0 mb-0"}`}>
              <p className="text-gray-400 text-[11px] sm:text-xs tracking-[0.25em] uppercase mb-4 sm:mb-5">
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
                </span>{" "}
                source.
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm max-w-lg mx-auto text-center mt-3 leading-relaxed">
                Type a title once and MangaVault checks multiple databases in parallel — then merges the results into a single ranked, deduplicated list with covers, ratings, and chapter counts.
              </p>
            </div>

            {/* ─── Search Bar (simplified for performance) ─── */}
            <form onSubmit={handleSearch} className="relative" role="search" aria-label="Search manga and manhwa">
              <div className="relative flex items-center justify-center">
                <div className="relative z-10 w-full bg-[#0a0a0e] rounded-2xl flex items-center border border-purple-500/20 focus-within:border-purple-500/50 transition-colors shadow-lg shadow-purple-500/5">
                  <label htmlFor="search-input" className="pl-4 sm:pl-5 pr-2 sm:pr-3 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="20" fill="none" stroke="currentColor">
                      <circle r="8" cy="11" cx="11" /><line y2="16.65" y1="22" x2="16.65" x1="22" />
                    </svg>
                  </label>
                  <input id="search-input" type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for a title — e.g. Solo Leveling, Tower of God" className="flex-1 bg-transparent py-4 sm:py-5 text-sm sm:text-base text-white placeholder-gray-500 outline-none" autoFocus />
                  {query && (
                    <button type="button" onClick={clearSearch} className="px-2 text-gray-500 hover:text-white transition-colors cursor-pointer focus:outline-none" aria-label="Clear"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  )}
                  <button type="submit" disabled={!query.trim() || isSearching} className="mr-2 sm:mr-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-black font-medium text-sm rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40">Search</button>
                </div>
              </div>
            </form>

            {/* Sample queries */}
            {showHero && (
              <div className="mt-4 sm:mt-5 relative" style={{ zIndex: 2 }}>
                <p className="text-gray-500 text-[11px] uppercase tracking-wider mb-2 text-center">Try a search</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 max-w-2xl mx-auto">
                  {SAMPLE_QUERIES.map(s => (
                    <button key={s.title} onClick={() => searchSample(s.title)} className="flex items-center justify-center gap-2 text-xs bg-bg-card border border-border-subtle rounded-lg px-3 py-2.5 hover:border-purple-500/50 hover:text-white text-gray-300 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 hover:translate-y-[-1px]">
                      <span className="font-medium text-white">{s.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{s.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Orbital loader */}
            {isSearching && (
              <div className="mt-8 mb-4">
                <OrbitalLoader message={statusText} />
              </div>
            )}

            {phase === "error" && <div className="mt-6"><div className="glass-card rounded-xl p-4 border border-red-900/30"><p className="text-red-400 text-sm">{error}</p></div></div>}
            {phase === "done" && results.length > 0 && <p className="text-gray-500 text-xs sm:text-sm mt-3 text-center">{statusText}</p>}
            {phase === "done" && results.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-300 text-sm mb-2">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-gray-500 text-xs mb-4">Try an exact title, an alternate spelling, or a shorter keyword.</p>
                <button onClick={clearSearch} className="text-xs text-white bg-bg-card border border-border-subtle rounded-lg px-4 py-2 hover:border-border-bright transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20">Browse trending instead</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Trending Now — horizontal scroll row ── */}
        {showTrending && (
          <TrendingRow
            results={trendingResults}
            loading={loadingTrending}
            onCardClick={(r) => { setSelectedResult(r); setShowChapters(false); }}
          />
        )}

        {/* ── Search results grid (only when user searched) ── */}
        {results.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-2 sm:mt-4 pb-8 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
              {results.map((result, idx) => (
                <ResultCard key={`${result.title}-${result.source}-${idx}`} result={result} onClick={() => { setSelectedResult(result); setShowChapters(false); }} priority={idx < 4} />
              ))}
            </div>
          </div>
        )}

        {/* ── Featured Promo Banner ── */}
        {showHero && !loadingTrending && (
          <div className="w-full pb-6">
            <FeaturedBanner />
          </div>
        )}

        {/* ── Genre Browser ── */}
        {showHero && !loadingTrending && <GenreSection onCardClick={(r) => { setSelectedResult(r); setShowChapters(false); }} />}

      </main>

      {selectedResult && <DetailModal result={selectedResult} showChapters={showChapters} onToggleChapters={() => setShowChapters(!showChapters)} onClose={() => { setSelectedResult(null); setShowChapters(false); }} />}

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/docs" className="hover:text-white transition-colors cursor-pointer">Docs</a>
            <a href="/about" className="hover:text-white transition-colors cursor-pointer">About</a>
            <a href="/privacy" className="hover:text-white transition-colors cursor-pointer">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors cursor-pointer">Terms</a>
            <a href="/dmca" className="hover:text-white transition-colors cursor-pointer">DMCA</a>
            <a href="mailto:hello@mangavault.in" className="hover:text-white transition-colors cursor-pointer">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


/* ═══════════════════ GENRE SECTION ═══════════════════ */
const HOMEPAGE_GENRES = ["Action", "Fantasy", "Romance", "Comedy", "Drama", "Sci-Fi"];

function GenreButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer group relative flex items-center gap-1.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-3xl transition font-bold shadow-md text-xs sm:text-sm flex-shrink-0 focus:outline-none uppercase tracking-wide ${
        active
          ? "bg-white text-black"
          : "bg-black/80 text-white hover:bg-black/60 border border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function GenreSection({ onCardClick }: { onCardClick: (r: MangaResult) => void }) {
  const [activeGenre, setActiveGenre] = useState(HOMEPAGE_GENRES[0]);
  const [genreResults, setGenreResults] = useState<MangaResult[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const genreScrollRef = useRef<HTMLDivElement>(null);

  const fetchGenre = useCallback(async (genre: string) => {
    setGenreLoading(true);
    setGenreResults([]);
    try {
      const res = await fetch(`/api/genres?q=${encodeURIComponent(genre)}`);
      if (res.ok) {
        const d = await res.json();
        // Limit results for performance
        setGenreResults((d.results || []).slice(0, MAX_GENRE_CARDS));
      }
    } catch { /* */ }
    finally { setGenreLoading(false); }
  }, []);

  useEffect(() => { fetchGenre(activeGenre); }, [activeGenre, fetchGenre]);

  const scrollGenre = (dir: "left" | "right") => {
    if (!genreScrollRef.current) return;
    const amount = genreScrollRef.current.clientWidth * 0.75;
    genreScrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">Browse by Genre</h3>
        <a href="/genres" className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1">
          View All
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </a>
      </div>

      {/* Genre pill buttons */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-3">
        {HOMEPAGE_GENRES.map(g => (
          <GenreButton key={g} label={g} active={g === activeGenre} onClick={() => setActiveGenre(g)} />
        ))}
      </div>

      {/* Genre results */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-500 text-xs sm:text-sm">{activeGenre} titles</p>
          <div className="flex items-center gap-2">
            <button onClick={() => scrollGenre("left")} aria-label="Scroll left" className="w-8 h-8 flex items-center justify-center rounded-full border border-border-subtle bg-bg-card text-gray-400 hover:bg-bg-hover hover:text-white transition-colors cursor-pointer focus:outline-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => scrollGenre("right")} aria-label="Scroll right" className="w-8 h-8 flex items-center justify-center rounded-full border border-border-subtle bg-bg-card text-gray-400 hover:bg-bg-hover hover:text-white transition-colors cursor-pointer focus:outline-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {genreLoading ? (
          <div className="flex gap-3 sm:gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse flex-shrink-0 w-[42vw] sm:w-[200px] md:w-[220px] lg:w-[240px]">
                <div className="aspect-[3/4] bg-bg-hover" />
                <div className="p-3 space-y-2"><div className="h-4 bg-bg-hover rounded w-3/4" /><div className="h-3 bg-bg-hover rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : genreResults.length > 0 ? (
          <div ref={genreScrollRef} className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {genreResults.map((result, idx) => (
              <div key={`${result.title}-${result.source}-${idx}`} className="flex-shrink-0 w-[42vw] sm:w-[200px] md:w-[220px] lg:w-[240px]">
                <ResultCard result={result} onClick={() => onCardClick(result)} priority={idx < 4} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center"><p className="text-gray-500 text-sm">No results found for {activeGenre}</p></div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ TRENDING ROW (horizontal scroll) ═══════════════════ */
function TrendingRow({ results, loading, onCardClick }: { results: MangaResult[]; loading: boolean; onCardClick: (r: MangaResult) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">Trending Now</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll("left")} aria-label="Scroll left" className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-border-subtle bg-bg-card text-gray-400 hover:bg-bg-hover hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scroll("right")} aria-label="Scroll right" className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-border-subtle bg-bg-card text-gray-400 hover:bg-bg-hover hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      {loading ? (
        <div className="flex gap-3 sm:gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse flex-shrink-0 w-[42vw] sm:w-[200px] md:w-[220px] lg:w-[240px]" aria-hidden="true">
              <div className="aspect-[3/4] bg-bg-hover" />
              <div className="p-3 space-y-2"><div className="h-4 bg-bg-hover rounded w-3/4" /><div className="h-3 bg-bg-hover rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {results.map((result, idx) => (
            <div key={`${result.title}-${result.source}-${idx}`} className="flex-shrink-0 w-[42vw] sm:w-[200px] md:w-[220px] lg:w-[240px]">
              <ResultCard result={result} onClick={() => onCardClick(result)} priority={idx < 4} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ RESULT CARD (Vertical Poster) ═══════════════════ */
const ResultCard = memo(function ResultCard({ result, onClick, priority = false }: { result: MangaResult; onClick: () => void; priority?: boolean }) {
  const statusLower = result.status.toLowerCase();
  const statusColor =
    statusLower === "completed" || statusLower === "finished"
      ? "bg-red-600 text-white"
      : statusLower === "ongoing"
        ? "bg-emerald-600 text-white"
        : "bg-amber-500 text-black";

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
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding={priority ? "sync" : "async"}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-card">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* Status badge — top-left corner (improved contrast) */}
        <span className={`absolute top-2 left-2 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md shadow-lg ${statusColor}`}>
          {result.status}
        </span>

        {/* Source badge — top-right corner */}
        {result.source && (
          <span className="absolute top-2 right-2 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-md bg-black/80 text-white backdrop-blur-sm border border-white/20">
            {result.source}
          </span>
        )}

        {/* Gradient overlay at the bottom of poster for readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* ── Info section ── */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug group-hover:text-gray-200 transition-colors">
          {result.title}
        </h3>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-xs sm:text-sm font-semibold text-gray-400 truncate">
            {firstGenre}
          </span>
          {result.rating !== "N/A" && (
            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-white flex-shrink-0">
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
});

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
      const nearBottom = scrollHeight - scrollTop - clientHeight < 600;
      setShowNavButtons(nearBottom);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
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
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-bg-secondary border-b border-border-subtle flex-shrink-0">
          <button onClick={() => { setReaderUrl(null); setReaderImages([]); setReaderError(""); setCurrentChapterIndex(null); }} className="flex items-center gap-2 text-xs sm:text-sm text-gray-300 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg px-3 py-1.5 bg-bg-card border border-border-subtle hover:border-border-bright">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h3 className="text-xs sm:text-sm text-white font-medium truncate max-w-[40%] sm:max-w-[50%]">{result.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-white/20" aria-label="Close reader">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Loading */}
        {readerLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" />
              </div>
              <p className="text-gray-400 text-xs">Extracting images...</p>
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
            {hasRealChapterList && canGoPrev && showNavButtons && (
              <div className="fixed left-3 sm:left-5 bottom-5 sm:bottom-6 z-20">
                <button onClick={goPrevChapter} className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                  Previous
                </button>
              </div>
            )}
            {hasRealChapterList && canGoNext && showNavButtons && (
              <div className="fixed right-3 sm:right-5 bottom-5 sm:bottom-6 z-20">
                <button onClick={goNextChapter} className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                  Next
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
                  <p className="text-gray-400 text-xs">End of chapter</p>
                  <button onClick={() => { setReaderUrl(null); setReaderImages([]); setCurrentChapterIndex(null); }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-white transition-colors">Back to chapters</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Detail view ───
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={result.title}>
      <div className="w-full sm:max-w-2xl max-h-[90vh] bg-bg-secondary border border-border-subtle rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border-subtle">
          <div className="flex gap-4 flex-1 min-w-0">
            {result.coverUrl ? <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover"><img src={result.coverUrl} alt="" className="w-full h-full object-cover" /></div> : <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg bg-bg-card flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{result.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.rating !== "N/A" && <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-md"><svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{result.rating}</span>}
                <span className={`text-xs px-2 py-1 rounded-md ${result.status.toLowerCase() === "completed" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>{result.status}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-300">{result.type}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ml-3 p-2 rounded-lg hover:bg-bg-hover transition-colors text-gray-400 hover:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20" aria-label="Close"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3"><MI l="Author" v={result.author} /><MI l="Artist" v={result.artist} /><MI l="Total Chapters" v={String(totalChapters)} /><MI l="Source" v={result.source} /></div>
          {result.genres.length > 0 && <div><h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Genres</h4><div className="flex flex-wrap gap-1.5">{result.genres.map(g => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-border-subtle">{g}</span>)}</div></div>}
          <div><h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Description</h4><p className="text-sm text-gray-300 leading-relaxed">{result.description}</p></div>

          {/* Chapters */}
          <div>
            <button onClick={onToggleChapters} className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-bg-card border border-border-subtle hover:border-border-bright transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20">
              <span className="text-sm font-medium text-white">All Chapters ({totalChapters})</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showChapters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {showChapters && (
              <div className="mt-2 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle" style={{ maxHeight: "50vh" }}>
                {result.chapters.length > 0 ? (
                  result.chapters.map((ch, i) => (
                    <button key={i} onClick={() => openReader(ch.url, i)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                      <span className="min-w-0 flex-1 text-sm text-emerald-400 font-medium truncate">
                        {ch.title}
                      </span>
                      <span className="flex-shrink-0 text-right whitespace-nowrap text-xs font-medium text-rose-400">
                        {ch.date || "—"}
                      </span>
                    </button>
                  ))
                ) : (
                  Array.from({ length: Math.min(totalChapters, 50) }, (_, i) => (
                    <button key={i} onClick={() => openReader(result.url)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                      <span className="min-w-0 flex-1 text-sm text-emerald-400 font-medium truncate">Chapter {totalChapters - i}</span>
                      <span className="flex-shrink-0 text-right whitespace-nowrap text-xs font-medium text-rose-400">—</span>
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
  return <div className="bg-bg-card rounded-lg p-3 border border-border-subtle"><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{l}</p><p className="text-sm text-white truncate">{v || "Unknown"}</p></div>;
}

function FeaturedBanner() {
  return (
    <div className="relative w-full overflow-hidden mx-auto max-w-7xl px-4 sm:px-6">
      <div className="relative w-full aspect-[21/9] sm:aspect-[21/8] md:aspect-[21/7] rounded-xl overflow-hidden">
        {/* Use CSS gradient instead of heavy image for better performance */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 via-purple-900/60 to-blue-900/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-6 py-6">
          <h3 className="text-white font-extrabold tracking-wide text-lg sm:text-2xl md:text-3xl mb-5 sm:mb-7 drop-shadow-lg">
            Explore Thousands of Titles
          </h3>

          <div className="flex items-center justify-center flex-wrap gap-5 sm:gap-8 md:gap-12 mb-4 sm:mb-6">
            <span className="font-serif italic text-white text-sm sm:text-lg md:text-xl">Manga</span>
            <span className="font-bold tracking-wider bg-purple-600 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-sm text-sm sm:text-lg md:text-xl">Manhwa</span>
            <span className="font-extrabold tracking-[0.15em] text-white text-sm sm:text-lg md:text-xl">Webtoon</span>
            <span className="font-bold tracking-wide text-white text-sm sm:text-lg md:text-xl">Manhua</span>
          </div>

          <p className="text-white font-bold uppercase tracking-[0.2em] text-xs sm:text-sm md:text-base mb-2 sm:mb-3 drop-shadow-md">
            All on MangaVault
          </p>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
