"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ChapterInfo { title: string; url: string; date: string; }
interface MangaResult {
  title: string; description: string; rating: string; status: string;
  type: string; genres: string[]; chapters: ChapterInfo[];
  chapterCount: string; coverUrl: string; url: string;
  source: string; author: string; artist: string;
  omegaSlug?: string;
}

const ADULT_GENRES = ["All", "Action", "Comedy", "Drama", "Fantasy", "Harem", "Isekai", "Romance", "Slice of Life", "Supernatural"];

export default function AdultPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedResult, setSelectedResult] = useState<MangaResult | null>(null);
  const [showChapters, setShowChapters] = useState(false);
  const [loadedChapters, setLoadedChapters] = useState<ChapterInfo[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerImages, setReaderImages] = useState<string[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState("");
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const container = readerScrollRef.current;
    if (!container || readerImages.length === 0) return;
    const onScroll = () => setShowNav(container.scrollHeight - container.scrollTop - container.clientHeight < 600);
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [readerImages]);

  const fetchResults = useCallback(async (q: string, g: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      if (g && g !== "All") params.set("genre", g);
      const res = await fetch(`/api/adult?${params}`);
      if (res.ok) {
        const d = await res.json();
        setResults(d.results || []);
        setHasMore(d.hasMore ?? false);
        setTotal(d.total || 0);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (confirmed) fetchResults(query, genre, page);
  }, [confirmed, query, genre, page, fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchResults(query, genre, 1);
  };

  const openReader = async (chUrl: string) => {
    setReaderUrl(chUrl); setReaderLoading(true); setReaderError(""); setReaderImages([]); setShowNav(false);
    if (readerScrollRef.current) readerScrollRef.current.scrollTop = 0;
    try {
      const res = await fetch(`/api/reader?url=${encodeURIComponent(chUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (data.images?.length > 0) setReaderImages(data.images);
      else setReaderError("No images found.");
    } catch (err) { setReaderError(err instanceof Error ? err.message : "Failed"); }
    finally { setReaderLoading(false); }
  };

  // ─── Age Gate ───
  if (!confirmed) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 sm:p-10 max-w-md w-full text-center space-y-6 border border-red-500/20">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">🔞</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Age Verification Required</h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            This section contains adult content intended for mature audiences only (18+). By proceeding, you confirm that you are of legal age in your jurisdiction.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setConfirmed(true)} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors cursor-pointer">
              I am 18+ — Enter
            </button>
            <a href="/" className="w-full py-3 bg-bg-card border border-border-subtle text-text-secondary font-medium rounded-xl hover:bg-bg-hover transition-colors block cursor-pointer">
              Go Back
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Reader ───
  if (readerUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-bg-secondary border-b border-border-subtle flex-shrink-0">
          <button onClick={() => { setReaderUrl(null); setReaderImages([]); setReaderError(""); }} className="text-xs sm:text-sm text-text-secondary hover:text-white cursor-pointer rounded-lg px-3 py-1.5 bg-bg-card border border-border-subtle">← Back</button>
          <button onClick={() => { setReaderUrl(null); setSelectedResult(null); }} className="text-text-muted hover:text-white p-1.5 cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        {readerLoading && <div className="flex-1 flex items-center justify-center"><p className="text-text-muted text-xs">Loading...</p></div>}
        {readerError && <div className="flex-1 flex items-center justify-center"><p className="text-red-400 text-sm">{readerError}</p></div>}
        {!readerLoading && !readerError && readerImages.length > 0 && (
          <div ref={readerScrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto flex flex-col items-center">
              {readerImages.map((src, i) => (<img key={i} src={src} alt={`Page ${i + 1}`} className="w-full h-auto select-none" loading={i < 3 ? "eager" : "lazy"} referrerPolicy="no-referrer" draggable={false} />))}
              <div className="py-8 text-center"><p className="text-text-muted text-xs mb-4">End of chapter</p>
                <button onClick={() => { setReaderUrl(null); setReaderImages([]); }} className="neu-button">Back to chapters</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Detail Modal ───
  const detailModal = selectedResult && (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={e => { if (e.target === e.currentTarget) { setSelectedResult(null); setShowChapters(false); setLoadedChapters([]); } }}>
      <div className="w-full sm:max-w-2xl max-h-[90vh] bg-bg-secondary border border-border-subtle rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up flex flex-col">
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border-subtle">
          <div className="flex gap-4 flex-1 min-w-0">
            {selectedResult.coverUrl ? <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover"><img src={selectedResult.coverUrl} alt="" className="w-full h-full object-cover" /></div> : <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg bg-bg-card flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">{selectedResult.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedResult.rating !== "N/A" && <span className="text-xs bg-white/10 px-2 py-1 rounded-md">⭐ {selectedResult.rating}</span>}
                <span className={`text-xs px-2 py-1 rounded-md ${selectedResult.status === "Completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>{selectedResult.status}</span>
              </div>
            </div>
          </div>
          <button onClick={() => { setSelectedResult(null); setShowChapters(false); setLoadedChapters([]); }} className="ml-3 p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-white cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {selectedResult.genres.length > 0 && <div className="flex flex-wrap gap-1.5">{selectedResult.genres.map(g => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-text-secondary border border-border-subtle">{g}</span>)}</div>}
          <p className="text-sm text-text-secondary leading-relaxed">{selectedResult.description}</p>
          <div>
            <button onClick={async () => {
              const newState = !showChapters;
              setShowChapters(newState);
              // Fetch chapters on first expand if not loaded yet
              if (newState && loadedChapters.length === 0) {
                const slug = selectedResult.omegaSlug || "";
                if (!slug) return;
                setChaptersLoading(true);
                try {
                  const res = await fetch(`/api/adult/chapters?slug=${encodeURIComponent(slug)}`);
                  if (res.ok) {
                    const data = await res.json();
                    setLoadedChapters(data.chapters || []);
                  }
                } catch { /* */ }
                finally { setChaptersLoading(false); }
              }
            }} className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-bg-card border border-border-subtle hover:border-border-bright transition-all cursor-pointer">
              <span className="text-sm font-medium text-white">Chapters ({selectedResult.chapterCount})</span>
              <svg className={`w-4 h-4 text-text-muted transition-transform ${showChapters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showChapters && (
              <div className="mt-2 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle" style={{ maxHeight: "50vh" }}>
                {chaptersLoading && (
                  <div className="py-6 text-center"><p className="text-text-muted text-xs animate-pulse">Loading chapters...</p></div>
                )}
                {!chaptersLoading && loadedChapters.length > 0 && loadedChapters.map((ch, i) => (
                  <button key={i} onClick={() => openReader(ch.url)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                    <span className="flex-1 text-sm text-green-400 font-medium truncate">{ch.title}</span>
                    <span className="text-xs text-red-400">{ch.date || "—"}</span>
                  </button>
                ))}
                {!chaptersLoading && loadedChapters.length === 0 && (
                  <div className="py-6 text-center"><p className="text-text-muted text-xs">No chapters available</p></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Main Page ───
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">18+</span>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">Manga<span className="text-text-muted">Vault</span> <span className="text-red-400 text-sm font-normal">Adult</span></span>
          </a>
          <a href="/" className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-3 py-1.5 hover:bg-bg-hover transition-colors">← Home</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search adult titles..." className="flex-1 bg-bg-card border border-border-subtle rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted outline-none focus:border-border-bright transition-colors" />
            <button type="submit" className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer">Search</button>
          </div>
        </form>

        {/* Genre filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-4">
          {ADULT_GENRES.map(g => (
            <button key={g} onClick={() => { setGenre(g); setPage(1); }} className={`cursor-pointer flex items-center px-5 py-2.5 rounded-3xl transition font-bold shadow-md text-xs flex-shrink-0 uppercase tracking-wide ${g === genre ? "bg-red-600 text-white" : "bg-black/80 text-white hover:bg-black/60 border border-white/10"}`}>
              {g}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-text-muted text-xs mb-4">{total} titles{genre !== "All" ? ` in ${genre}` : ""}{query ? ` matching "${query}"` : ""}</p>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse"><div className="aspect-[3/4] bg-bg-hover" /><div className="p-3 space-y-2"><div className="h-4 bg-bg-hover rounded w-3/4" /><div className="h-3 bg-bg-hover rounded w-1/2" /></div></div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {results.map((r, i) => {
              const statusColor = r.status.toLowerCase() === "completed" ? "bg-red-500/90 text-white" : r.status.toLowerCase() === "ongoing" ? "bg-green-500/90 text-white" : "bg-yellow-500/90 text-black";
              return (
                <button key={`${r.title}-${i}`} onClick={() => { setSelectedResult(r); setShowChapters(false); setLoadedChapters([]); }} className="glass-card rounded-xl overflow-hidden text-left transition-all duration-200 hover:translate-y-[-4px] hover:shadow-lg group cursor-pointer flex flex-col w-full focus:outline-none">
                  <div className="relative aspect-[3/4] bg-bg-hover overflow-hidden">
                    {r.coverUrl ? <img src={r.coverUrl} alt={r.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <div className="w-full h-full flex items-center justify-center bg-bg-card"><span className="text-3xl">🔞</span></div>}
                    <span className={`absolute top-2 left-2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md shadow-md ${statusColor}`}>{r.status}</span>
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>
                  <div className="p-3 sm:p-3.5 flex flex-col gap-2 flex-1">
                    <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug">{r.title}</h3>
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <span className="text-xs sm:text-sm font-semibold text-text-secondary truncate">{r.genres[0] || r.type}</span>
                      {r.rating !== "N/A" && <span className="text-xs sm:text-sm font-bold text-text-primary">⭐ {r.rating}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && results.length === 0 && <div className="text-center py-16"><p className="text-text-secondary text-sm">No results found</p></div>}

        {/* Pagination */}
        {(hasMore || page > 1) && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2.5 rounded-xl border border-border-subtle bg-bg-card text-text-secondary text-sm disabled:opacity-30 cursor-pointer hover:bg-bg-hover">← Prev</button>
            <span className="text-text-muted text-sm">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore} className="px-4 py-2.5 rounded-xl border border-border-subtle bg-bg-card text-text-secondary text-sm disabled:opacity-30 cursor-pointer hover:bg-bg-hover">Next →</button>
          </div>
        )}
      </main>

      {detailModal}

      <footer className="border-t border-border-subtle py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/docs" className="hover:text-white transition-colors">API Docs</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/dmca" className="hover:text-white transition-colors">DMCA</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
