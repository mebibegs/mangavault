"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const ALL_GENRES = [
  "Action","Adventure","Comedy","Drama","Fantasy","Romance","Sci-Fi","Thriller",
  "Supernatural","Horror","Mystery","Slice of Life","School Life","Sports",
  "Martial Arts","Murim","Isekai","Reincarnation","Regression","Revenge",
  "System","Tower","Dungeon","Demons","Magic","Overpowered","Genius MC","Crazy MC",
  "Villain","Violence","Tragedy","Necromancer","Game","Shounen","Shoujo",
  "Superhero","Graphic Novel","Wuxia","Xianxia","Cultivation","Mecha",
  "Military","Historical","Cyberpunk","Steampunk","Space Opera","Psychological",
  "Crime","Detective","Survival","Battle Royale","Post-Apocalyptic","Dystopian",
  "Monster","Vampires","Zombies","Ghosts","Aliens","Time Travel","Time Loop",
  "Transmigration","Hunter","Academy","Kingdom Building","Politics","Family",
  "Coming of Age","Harem","Parody","Cooking","Gaming","Esports",
  "Mythology","Folklore","Occult","Alchemy","Virtual Reality",
  "Super Power","Psychic","Transformation","Dragons","Farming","Slow Life",
  "Weak-to-Strong","Underdog","Anti-Hero","Villain Protagonist",
];

interface ChapterInfo { title: string; url: string; date: string; }
interface MangaResult {
  title: string; description: string; rating: string; status: string;
  type: string; genres: string[]; chapters: ChapterInfo[];
  chapterCount: string; coverUrl: string; url: string;
  source: string; author: string; artist: string;
}

function GenresPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedGenre = searchParams.get("q") || ALL_GENRES[0];
  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<MangaResult | null>(null);
  const [showChapters, setShowChapters] = useState(false);

  const search = useCallback(async (genre: string) => {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`/api/genres?q=${encodeURIComponent(genre)}`);
      if (res.ok) {
        const d = await res.json();
        setResults(d.results || []);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { search(selectedGenre); }, [selectedGenre, search]);

  const selectGenre = (g: string) => {
    router.push(`/genres?q=${encodeURIComponent(g)}`, { scroll: false });
  };

  const statusColor = (s: string) => {
    const sl = s.toLowerCase();
    return sl === "completed" || sl === "finished"
      ? "bg-red-500/90 text-white"
      : sl === "ongoing"
        ? "bg-green-500/90 text-white"
        : "bg-yellow-500/90 text-black";
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">Manga<span className="text-text-muted">Vault</span></span>
          </a>
          <a href="/" className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-3 py-1.5 hover:bg-bg-hover transition-colors">← Home</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">All Genres</h2>

        <div className="flex gap-6">
          {/* Left sidebar — genre list (desktop) */}
          <div className="hidden md:flex flex-col gap-1.5 w-52 lg:w-60 flex-shrink-0 max-h-[calc(100vh-160px)] overflow-y-auto sticky top-24 pr-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {ALL_GENRES.map(g => (
              <button
                key={g}
                onClick={() => selectGenre(g)}
                className={`cursor-pointer flex items-center px-4 py-2.5 rounded-3xl transition font-bold shadow-md text-xs flex-shrink-0 text-left focus:outline-none uppercase tracking-wide ${
                  g === selectedGenre
                    ? "bg-white text-black"
                    : "bg-black/80 text-white hover:bg-black/60 border border-white/10"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Mobile genre selector */}
          <div className="md:hidden w-full mb-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3" style={{ scrollbarWidth: "none" }}>
              {ALL_GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => selectGenre(g)}
                  className={`cursor-pointer flex items-center px-4 py-2.5 rounded-3xl transition font-bold shadow-md text-xs flex-shrink-0 focus:outline-none uppercase tracking-wide ${
                    g === selectedGenre
                      ? "bg-white text-black"
                      : "bg-black/80 text-white hover:bg-black/60 border border-white/10"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Right side — results grid */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">{selectedGenre}</h3>

            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-[3/4] bg-bg-hover" />
                    <div className="p-3 space-y-2"><div className="h-4 bg-bg-hover rounded w-3/4" /><div className="h-3 bg-bg-hover rounded w-1/2" /></div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {results.map((r, i) => (
                  <button
                    key={`${r.title}-${i}`}
                    onClick={() => { setSelectedResult(r); setShowChapters(false); }}
                    className="glass-card rounded-xl overflow-hidden text-left transition-all duration-200 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-white/5 group cursor-pointer flex flex-col w-full focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <div className="relative aspect-[3/4] bg-bg-hover overflow-hidden">
                      {r.coverUrl ? (
                        <img src={r.coverUrl} alt={r.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-bg-card">
                          <svg className="w-10 h-10 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md shadow-md ${statusColor(r.status)}`}>{r.status}</span>
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                    <div className="p-3 sm:p-3.5 flex flex-col gap-2 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug">{r.title}</h3>
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <span className="text-xs sm:text-sm font-semibold text-text-secondary truncate">{r.genres[0] || r.type}</span>
                        {r.rating !== "N/A" && (
                          <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-text-primary flex-shrink-0">
                            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            {r.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="text-center py-16">
                <p className="text-text-secondary text-sm">No results found for &ldquo;{selectedGenre}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedResult && (
        <GenreDetailModal
          result={selectedResult}
          showChapters={showChapters}
          onToggleChapters={() => setShowChapters(!showChapters)}
          onClose={() => { setSelectedResult(null); setShowChapters(false); }}
        />
      )}

      <footer className="border-t border-border-subtle py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault · v1.0.0</span>
          <div className="flex gap-4">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/docs" className="hover:text-white transition-colors">API Docs</a>
            <a href="/about" className="hover:text-white transition-colors">About</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════ DETAIL MODAL FOR GENRES PAGE ═══════════════════ */
function GenreDetailModal({ result, showChapters, onToggleChapters, onClose }: { result: MangaResult; showChapters: boolean; onToggleChapters: () => void; onClose: () => void }) {
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerImages, setReaderImages] = useState<string[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState("");
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = readerScrollRef.current;
    if (!container || readerImages.length === 0) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowNavButtons(scrollHeight - scrollTop - clientHeight < 600);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [readerImages]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { if (readerUrl) setReaderUrl(null); else onClose(); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, readerUrl]);

  const totalChapters = parseInt(result.chapterCount) || result.chapters.length;

  const getChapterNumber = (ch: ChapterInfo): number | null => {
    const m = (ch.title || "").match(/(?:chapter|ch\.?|ep\.?|episode)\s*([\d.]+)/i);
    if (m) return parseFloat(m[1]);
    const u = (ch.url || "").match(/(?:chapter|episode)[-_/]([\d.]+)/i);
    if (u) return parseFloat(u[1]);
    const f = (ch.title || "").match(/([\d.]+)/);
    return f ? parseFloat(f[1]) : null;
  };

  const openReader = async (chUrl: string, chapterIndex?: number) => {
    if (typeof chapterIndex === "number") setCurrentChapterIndex(chapterIndex);
    setReaderUrl(chUrl); setReaderLoading(true); setReaderError(""); setReaderImages([]); setShowNavButtons(false);
    if (readerScrollRef.current) readerScrollRef.current.scrollTop = 0;
    try {
      const res = await fetch(`/api/reader?url=${encodeURIComponent(chUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (data.images?.length > 0) setReaderImages(data.images);
      else setReaderError("No images found for this chapter.");
    } catch (err) { setReaderError(err instanceof Error ? err.message : "Failed to load chapter"); }
    finally { setReaderLoading(false); }
  };

  const hasRealChapterList = result.chapters.length > 0;
  const currentChapter = hasRealChapterList && currentChapterIndex !== null ? result.chapters[currentChapterIndex] ?? null : null;
  const currentChapterNumber = currentChapter ? getChapterNumber(currentChapter) : null;
  const chapterEntries = hasRealChapterList ? result.chapters.map((ch, idx) => ({ chapter: ch, index: idx, number: getChapterNumber(ch) })).filter(e => e.number !== null) : [];
  const prevEntry = currentChapterNumber === null ? null : chapterEntries.filter(e => (e.number as number) < currentChapterNumber).sort((a, b) => (b.number as number) - (a.number as number))[0] ?? null;
  const nextEntry = currentChapterNumber === null ? null : chapterEntries.filter(e => (e.number as number) > currentChapterNumber).sort((a, b) => (a.number as number) - (b.number as number))[0] ?? null;

  if (readerUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-bg-secondary border-b border-border-subtle flex-shrink-0">
          <button onClick={() => { setReaderUrl(null); setReaderImages([]); setReaderError(""); setCurrentChapterIndex(null); }} className="flex items-center gap-2 text-xs sm:text-sm text-text-secondary hover:text-white transition-colors cursor-pointer rounded-lg px-3 py-1.5 bg-bg-card border border-border-subtle hover:border-border-bright">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back
          </button>
          <h3 className="text-xs sm:text-sm text-white font-medium truncate max-w-[40%]">{result.title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1.5 rounded-lg hover:bg-bg-hover cursor-pointer" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {readerLoading && <div className="flex-1 flex items-center justify-center"><p className="text-text-muted text-xs">Loading...</p></div>}
        {readerError && <div className="flex-1 flex items-center justify-center px-6 text-center"><p className="text-red-400 text-sm">{readerError}</p></div>}
        {!readerLoading && !readerError && readerImages.length > 0 && (
          <>
            {hasRealChapterList && prevEntry && showNavButtons && (
              <div className="fixed left-3 sm:left-5 bottom-5 z-20 animate-fade-in-up">
                <button onClick={() => openReader(prevEntry.chapter.url, prevEntry.index)} className="chapter-nav-btn"><span className="chapter-nav-blob" /><span className="chapter-nav-inner">Previous</span></button>
              </div>
            )}
            {hasRealChapterList && nextEntry && showNavButtons && (
              <div className="fixed right-3 sm:right-5 bottom-5 z-20 animate-fade-in-up">
                <button onClick={() => openReader(nextEntry.chapter.url, nextEntry.index)} className="chapter-nav-btn"><span className="chapter-nav-blob" /><span className="chapter-nav-inner">Next</span></button>
              </div>
            )}
            <div ref={readerScrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto flex flex-col items-center">
                {readerImages.map((src, i) => (<img key={i} src={src} alt={`Page ${i + 1}`} className="w-full h-auto select-none" loading={i < 3 ? "eager" : "lazy"} referrerPolicy="no-referrer" draggable={false} />))}
                <div className="py-8 px-4 text-center"><p className="text-text-muted text-xs mb-4">End of chapter</p>
                  <button onClick={() => { setReaderUrl(null); setReaderImages([]); setCurrentChapterIndex(null); }} className="neu-button">Back to chapters</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
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
          <button onClick={onClose} className="ml-3 p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-white cursor-pointer" aria-label="Close"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <MIBox l="Author" v={result.author} /><MIBox l="Artist" v={result.artist} />
            <MIBox l="Total Chapters" v={String(totalChapters)} /><MIBox l="Source" v={result.source} />
          </div>
          {result.genres.length > 0 && <div><h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Genres</h4><div className="flex flex-wrap gap-1.5">{result.genres.map(g => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-text-secondary border border-border-subtle">{g}</span>)}</div></div>}
          <div><h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Description</h4><p className="text-sm text-text-secondary leading-relaxed">{result.description}</p></div>
          <div>
            <button onClick={onToggleChapters} className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-bg-card border border-border-subtle hover:border-border-bright transition-all cursor-pointer">
              <span className="text-sm font-medium text-white">All Chapters ({totalChapters})</span>
              <svg className={`w-4 h-4 text-text-muted transition-transform duration-200 ${showChapters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showChapters && (
              <div className="mt-2 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle" style={{ maxHeight: "50vh" }}>
                {result.chapters.length > 0 ? result.chapters.map((ch, i) => (
                  <button key={i} onClick={() => openReader(ch.url, i)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                    <span className="min-w-0 flex-1 text-sm text-green-400 font-medium truncate">{ch.title}</span>
                    <span className="flex-shrink-0 text-xs font-medium text-red-400">{ch.date || "—"}</span>
                  </button>
                )) : (
                  Array.from({ length: totalChapters }, (_, i) => (
                    <button key={i} onClick={() => openReader(result.url)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                      <span className="min-w-0 flex-1 text-sm text-green-400 font-medium truncate">Chapter {totalChapters - i}</span>
                      <span className="flex-shrink-0 text-xs font-medium text-red-400">—</span>
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

function MIBox({ l, v }: { l: string; v: string }) {
  return <div className="bg-bg-card rounded-lg p-3 border border-border-subtle"><p className="text-xs text-text-muted uppercase tracking-wider mb-1">{l}</p><p className="text-sm text-text-primary truncate">{v || "Unknown"}</p></div>;
}

export default function GenresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center"><p className="text-text-muted">Loading...</p></div>}>
      <GenresPageContent />
    </Suspense>
  );
}
