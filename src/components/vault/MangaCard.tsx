"use client";

import { memo, useRef, useEffect } from "react";
import Image from "next/image";

interface ChapterInfo { title: string; url: string; date: string; }
export interface MangaResult {
  title: string; description: string; rating: string; status: string;
  type: string; genres: string[]; chapters: ChapterInfo[];
  chapterCount: string; coverUrl: string; url: string;
  source: string; author: string; artist: string;
  omegaSlug?: string; sourceSlug?: string;
}

export function useReveal<T extends HTMLElement>(delayIndex = 0) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es: IntersectionObserverEntry[]) => {
      es.forEach(e => {
        if (e.isIntersecting) { (e.target as HTMLElement).style.opacity = "1"; io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    el.style.opacity = "0";
    el.style.transition = "opacity .5s ease";
    io.observe(el);
    return () => io.disconnect();
  }, [delayIndex]);
  return ref;
}

const MangaCard = memo(function MangaCard({
  result,
  onClick,
  rank,
  index = 0,
  priority = false,
}: {
  result: MangaResult;
  onClick: () => void;
  rank?: string;
  index?: number;
  priority?: boolean;
}) {
  const ref = useReveal<HTMLButtonElement>(index);

  const statusClass = (() => {
    const s = result.status.toLowerCase();
    if (s === "ongoing") return "st-ongoing";
    if (s === "completed" || s === "finished") return "st-completed";
    if (s === "dropped" || s === "cancelled" || s === "canceled") return "st-dropped";
    if (s === "hiatus" || s === "on hiatus") return "st-hiatus";
    return "st-default";
  })();

  return (
    <button
      ref={ref}
      className="card"
      onClick={onClick}
      aria-label={result.title}
    >
      <span className="cover-wrap">
        <span className="cover-clip">
          {result.coverUrl ? (
            <Image
              src={result.coverUrl}
              alt={`Cover of ${result.title}`}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1200px) 320px, 380px"
              quality={75}
              priority={priority}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="cover-fallback">{result.title.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        {rank != null && (
          <span className="card-badge">{rank}</span>
        )}
      </span>
      <span className="card-body">
        <h3 className="card-title">{result.title}</h3>
        <div className="card-meta">
          {result.rating !== "N/A" && <span className="rate">★ {result.rating}</span>}
          <span>CH. {result.chapterCount && result.chapterCount !== "0" ? result.chapterCount : "—"}</span>
          <span className={`st ${statusClass}`}>{result.status}</span>
        </div>
        {result.genres.length > 0 && (
          <div className="tags" style={{ marginTop: 8 }}>
            {result.genres.slice(0, 3).map(g => <span key={g} className="tag">{g}</span>)}
          </div>
        )}
      </span>
    </button>
  );
});

export default MangaCard;