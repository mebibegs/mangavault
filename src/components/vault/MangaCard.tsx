"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { vaultShatter } from "./VaultFX";

interface ChapterInfo { title: string; url: string; date: string; }
export interface MangaResult {
  title: string; description: string; rating: string; status: string;
  type: string; genres: string[]; chapters: ChapterInfo[];
  chapterCount: string; coverUrl: string; url: string;
  source: string; author: string; artist: string;
  omegaSlug?: string; sourceSlug?: string;
}

/* comic star-burst + slash cut-out accents (hero card only) */
export function PopArt() {
  return (
    <>
      <svg className="pop" viewBox="0 0 100 110" aria-hidden="true">
        <path d="M50 4 L57 22 71 10 66 30 86 26 72 42 96 48 76 58 90 76 66 70 72 94 55 78 50 104 45 78 28 94 34 70 10 76 24 58 4 48 28 42 14 26 34 30 29 10 43 22 Z" fill="#ffffff" stroke="#000000" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="50" cy="48" r="8" fill="#000000" />
      </svg>
      <svg className="pop slashp" viewBox="0 0 160 60" aria-hidden="true">
        <path d="M2 50 L118 14 158 4 128 20 34 54 Z" fill="#ffffff" stroke="#000000" strokeWidth="2" />
      </svg>
    </>
  );
}

/** Ink-bleed reveal on scroll — adds .in when the element enters the viewport. */
export function useReveal<T extends HTMLElement>(delayIndex = 0) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--d", `${(delayIndex % 9) * 55}ms`);
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -4% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [delayIndex]);
  return ref;
}

const MangaCard = memo(function MangaCard({
  result,
  onClick,
  rank,
  pop = false,
  index = 0,
  priority = false,
}: {
  result: MangaResult;
  onClick: () => void;
  rank?: string;
  pop?: boolean;
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

  const onMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    const t = el.querySelector<HTMLElement>(".tilt"); if (!t) return;
    t.style.setProperty("--rx", (-py * 9).toFixed(2) + "deg");
    t.style.setProperty("--ry", (px * 11).toFixed(2) + "deg");
    t.style.setProperty("--rxn", (-py * 9).toFixed(2));
    t.style.setProperty("--ryn", (px * 11).toFixed(2));
  }, [ref]);

  const onLeave = useCallback(() => {
    const t = ref.current?.querySelector<HTMLElement>(".tilt"); if (!t) return;
    t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg");
    t.style.setProperty("--rxn", "0"); t.style.setProperty("--ryn", "0");
  }, [ref]);

  const click = useCallback(() => {
    const el = ref.current;
    if (el) {
      const img = el.querySelector<HTMLImageElement>(".cover-clip img");
      const wrap = el.querySelector<HTMLElement>(".cover-wrap");
      if (img?.currentSrc && wrap) {
        vaultShatter(wrap.getBoundingClientRect(), img.currentSrc);
        el.classList.add("ghost");
        setTimeout(() => { el.classList.remove("ghost"); }, 900);
        setTimeout(onClick, 260);
        return;
      }
    }
    onClick();
  }, [onClick, ref]);

  return (
    <button
      ref={ref}
      className="card reveal"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={click}
      aria-label={result.title}
    >
      <span className="tilt">
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
          <span className="speed" />
          {rank != null && <span className="rankwrap"><span className="rank">{rank}</span></span>}
          {pop && <PopArt />}
        </span>
        <span className="meta">
          <span className="ttl">{result.title}</span>
          <hr className="sep" />
          <span className="row1">
            <span className="rate">★ {result.rating !== "N/A" ? result.rating : "N/A"}</span>
            <span className="dot">•</span>
            <span>CH. {result.chapterCount && result.chapterCount !== "0" ? result.chapterCount : "—"}</span>
            <span className={`st ${statusClass}`}>{result.status}</span>
          </span>
          {result.genres.length > 0 && (
            <>
              <hr className="sep" />
              <span className="tags">
                {result.genres.slice(0, 3).map(g => <span key={g} className="tag">{g}</span>)}
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  );
});

export default MangaCard;
