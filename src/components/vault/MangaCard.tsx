"use client";

import { memo, useRef, useEffect } from "react";
import Image from "next/image";
import ViewCount from "./ViewCount";
import RankBadge from "./RankBadge";

interface ChapterInfo { title: string; url: string; date: string; }
export interface MangaResult {
  title: string; description: string; rating: string; status: string;
  type: string; genres: string[]; chapters: ChapterInfo[];
  chapterCount: string; coverUrl: string; url: string;
  source: string; author: string; artist: string;
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
    el.style.transition = "opacity .4s ease";
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
  rank?: number;
  index?: number;
  priority?: boolean;
}) {
  const ref = useReveal<HTMLButtonElement>(index);
  const seed = result.url || result.title;

  return (
    <button
      ref={ref}
      className="wcard"
      onClick={onClick}
      aria-label={result.title}
    >
      <span className="wcard-cover-wrap">
        <span className="wcard-cover-clip">
          {result.coverUrl ? (
            <Image
              src={result.coverUrl}
              alt={`Cover of ${result.title}`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
              quality={75}
              priority={priority}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="wcard-fallback">{result.title.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        {rank != null && <RankBadge rank={rank} seed={seed} />}
      </span>
      <span className="wcard-body">
        <h3 className="wcard-title">{result.title}</h3>
        {result.genres.length > 0 && (
          <span className="wcard-genre">{result.genres[0]}</span>
        )}
        <ViewCount seed={seed} />
      </span>
    </button>
  );
});

export default MangaCard;
