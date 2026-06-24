"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ResultCard, type MangaResult } from "./HomeClient";

const MAX_GENRE_CARDS = 15;
const HOMEPAGE_GENRES = ["Action", "Fantasy", "Romance", "Comedy", "Drama", "Sci-Fi"];

export default function GenreSection({ onCardClick }: { onCardClick: (r: MangaResult) => void }) {
  const [activeGenre, setActiveGenre] = useState(HOMEPAGE_GENRES[0]);
  const [genreResults, setGenreResults] = useState<MangaResult[]>([]);
  const [genreLoading, setGenreLoading] = useState(true); // Start loading=true
  const genreScrollRef = useRef<HTMLDivElement>(null);

  const fetchGenre = useCallback(async (genre: string) => {
    setGenreLoading(true); setGenreResults([]);
    try {
      const res = await fetch(`/api/genres?q=${encodeURIComponent(genre)}`);
      if (res.ok) { const d = await res.json(); setGenreResults((d.results || []).slice(0, MAX_GENRE_CARDS)); }
    } catch { /* */ }
    finally { setGenreLoading(false); }
  }, []);

  useEffect(() => { fetchGenre(activeGenre); }, [activeGenre, fetchGenre]);
  const scrollGenre = (dir: "left" | "right") => { if (!genreScrollRef.current) return; genreScrollRef.current.scrollBy({ left: dir === "left" ? -genreScrollRef.current.clientWidth * 0.75 : genreScrollRef.current.clientWidth * 0.75, behavior: "smooth" }); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">Browse by Genre</h2>
        <a href="/genres" className="text-xs sm:text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1">View All <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></a>
      </div>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-3">
        {HOMEPAGE_GENRES.map(g => (
          <button key={g} onClick={() => setActiveGenre(g)} className={`cursor-pointer flex items-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-3xl transition font-bold shadow-md text-xs sm:text-sm flex-shrink-0 uppercase tracking-wide ${g === activeGenre ? "bg-white text-black" : "bg-black/80 text-white hover:bg-black/60 border border-white/20"}`}>{g}</button>
        ))}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-500 text-xs sm:text-sm">{activeGenre} titles</p>
          <div className="flex items-center gap-2">
            <button onClick={() => scrollGenre("left")} aria-label="Scroll left" className="w-8 h-8 flex items-center justify-center rounded-full border border-border-subtle bg-bg-card text-gray-400 hover:bg-bg-hover hover:text-white transition-colors cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <button onClick={() => scrollGenre("right")} aria-label="Scroll right" className="w-8 h-8 flex items-center justify-center rounded-full border border-border-subtle bg-bg-card text-gray-400 hover:bg-bg-hover hover:text-white transition-colors cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
        {genreLoading ? (
          <div className="flex gap-3 sm:gap-4 overflow-hidden">{[...Array(6)].map((_, i) => (<div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse flex-shrink-0 w-[42vw] sm:w-[200px] md:w-[220px] lg:w-[240px]"><div className="aspect-[3/4] bg-bg-hover" /><div className="p-3 space-y-2"><div className="h-4 bg-bg-hover rounded w-3/4" /><div className="h-3 bg-bg-hover rounded w-1/2" /></div></div>))}</div>
        ) : genreResults.length > 0 ? (
          <div ref={genreScrollRef} className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {genreResults.map((result, idx) => (<div key={`${result.title}-${result.source}-${idx}`} className="flex-shrink-0 w-[42vw] sm:w-[200px] md:w-[220px] lg:w-[240px]"><ResultCard result={result} onClick={() => onCardClick(result)} priority={idx < 4} /></div>))}
          </div>
        ) : <div className="py-8 text-center"><p className="text-gray-500 text-sm">No results found for {activeGenre}</p></div>}
      </div>
    </div>
  );
}
