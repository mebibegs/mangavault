"use client";

import { useState, useRef, useEffect } from "react";
import type { MangaResult } from "./HomeClient";

interface ChapterInfo { title: string; url: string; date: string; }

export default function DetailModal({ result, showChapters, onToggleChapters, onClose }: { result: MangaResult; showChapters: boolean; onToggleChapters: () => void; onClose: () => void }) {
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerImages, setReaderImages] = useState<string[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState("");
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = readerScrollRef.current;
    if (!container || readerImages.length === 0) return;
    const onScroll = () => { const { scrollTop, scrollHeight, clientHeight } = container; setShowNavButtons(scrollHeight - scrollTop - clientHeight < 600); };
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

  const getChapterNumber = (chapter: ChapterInfo): number | null => {
    const title = chapter.title || ""; const url = chapter.url || "";
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
    setReaderUrl(chUrl); setReaderLoading(true); setReaderError(""); setReaderImages([]); setShowNavButtons(false);
    if (readerScrollRef.current) readerScrollRef.current.scrollTop = 0;
    try {
      const res = await fetch(`/api/reader?url=${encodeURIComponent(chUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (data.images && data.images.length > 0) setReaderImages(data.images);
      else setReaderError("No images found for this chapter.");
    } catch (err) { setReaderError(err instanceof Error ? err.message : "Failed to load chapter"); }
    finally { setReaderLoading(false); }
  };

  const hasRealChapterList = result.chapters.length > 0;
  const currentChapter = hasRealChapterList && currentChapterIndex !== null ? result.chapters[currentChapterIndex] ?? null : null;
  const currentChapterNumber = currentChapter ? getChapterNumber(currentChapter) : null;
  const chapterEntries = hasRealChapterList ? result.chapters.map((chapter, index) => ({ chapter, index, number: getChapterNumber(chapter) })).filter((e) => e.number !== null) : [];
  const prevEntry = currentChapterNumber === null ? null : chapterEntries.filter((e) => (e.number as number) < currentChapterNumber).sort((a, b) => (b.number as number) - (a.number as number))[0] ?? null;
  const nextEntry = currentChapterNumber === null ? null : chapterEntries.filter((e) => (e.number as number) > currentChapterNumber).sort((a, b) => (a.number as number) - (b.number as number))[0] ?? null;

  if (readerUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-bg-secondary border-b border-border-subtle flex-shrink-0">
          <button onClick={() => { setReaderUrl(null); setReaderImages([]); setReaderError(""); setCurrentChapterIndex(null); }} className="flex items-center gap-2 text-xs sm:text-sm text-gray-300 hover:text-white transition-colors cursor-pointer rounded-lg px-3 py-1.5 bg-bg-card border border-border-subtle hover:border-border-bright">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Back
          </button>
          <h3 className="text-xs sm:text-sm text-white font-medium truncate max-w-[40%] sm:max-w-[50%]">{result.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-bg-hover" aria-label="Close reader">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {readerLoading && <div className="flex-1 flex items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="relative w-10 h-10"><div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" /></div><p className="text-gray-400 text-xs">Extracting images...</p></div></div>}
        {readerError && <div className="flex-1 flex items-center justify-center px-6"><div className="text-center"><p className="text-red-400 text-sm mb-2">{readerError}</p><button onClick={() => { setReaderUrl(null); setReaderError(""); }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-white transition-colors">Back to chapters</button></div></div>}
        {!readerLoading && !readerError && readerImages.length > 0 && (
          <>
            {prevEntry && showNavButtons && <div className="fixed left-3 sm:left-5 bottom-5 sm:bottom-6 z-20"><button onClick={() => openReader(prevEntry.chapter.url, prevEntry.index)} className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors">Previous</button></div>}
            {nextEntry && showNavButtons && <div className="fixed right-3 sm:right-5 bottom-5 sm:bottom-6 z-20"><button onClick={() => openReader(nextEntry.chapter.url, nextEntry.index)} className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-colors">Next</button></div>}
            <div ref={readerScrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto flex flex-col items-center">
                {readerImages.map((src, i) => (<img key={i} src={src} alt={`Page ${i + 1}`} className="w-full h-auto select-none" loading={i < 3 ? "eager" : "lazy"} referrerPolicy="no-referrer" draggable={false} />))}
                <div className="py-8 px-4 text-center space-y-5"><p className="text-gray-400 text-xs">End of chapter</p><button onClick={() => { setReaderUrl(null); setReaderImages([]); setCurrentChapterIndex(null); }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-white transition-colors">Back to chapters</button></div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

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
          <button onClick={onClose} className="ml-3 p-2 rounded-lg hover:bg-bg-hover transition-colors text-gray-400 hover:text-white cursor-pointer" aria-label="Close"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <MI l="Author" v={result.author} /><MI l="Artist" v={result.artist} /><MI l="Total Chapters" v={String(totalChapters)} /><MI l="Source" v={result.source} />
          </div>
          {result.genres.length > 0 && <div><h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Genres</h4><div className="flex flex-wrap gap-1.5">{result.genres.map(g => <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 border border-border-subtle">{g}</span>)}</div></div>}
          <div><h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Description</h4><p className="text-sm text-gray-300 leading-relaxed">{result.description}</p></div>
          <div>
            <button onClick={onToggleChapters} className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-bg-card border border-border-subtle hover:border-border-bright transition-all cursor-pointer">
              <span className="text-sm font-medium text-white">All Chapters ({totalChapters})</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showChapters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showChapters && (
              <div className="mt-2 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle" style={{ maxHeight: "50vh" }}>
                {result.chapters.length > 0 ? result.chapters.map((ch, i) => (
                  <button key={i} onClick={() => openReader(ch.url, i)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                    <span className="min-w-0 flex-1 text-sm text-emerald-400 font-medium truncate">{ch.title}</span>
                    <span className="flex-shrink-0 text-right whitespace-nowrap text-xs font-medium text-rose-400">{ch.date || "—"}</span>
                  </button>
                )) : Array.from({ length: Math.min(totalChapters, 50) }, (_, i) => (
                  <button key={i} onClick={() => openReader(result.url)} className="w-full flex items-center px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer text-left gap-3">
                    <span className="min-w-0 flex-1 text-sm text-emerald-400 font-medium truncate">Chapter {totalChapters - i}</span>
                    <span className="flex-shrink-0 text-right whitespace-nowrap text-xs font-medium text-rose-400">—</span>
                  </button>
                ))}
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
