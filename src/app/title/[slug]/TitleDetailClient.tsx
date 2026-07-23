"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import { vaultFlash } from "@/components/vault/VaultFX";

interface ChapterInfo { title: string; url: string; date: string; }

interface TitleDetailClientProps {
  initialResult: MangaResult;
  slug: string;
}

export default function TitleDetailClient({ initialResult, slug }: TitleDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<MangaResult>(initialResult);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerImages, setReaderImages] = useState<string[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState("");
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const [loadedChapters, setLoadedChapters] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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

  const getChapterNumber = (chapter: ChapterInfo): number | null => {
    const title = chapter.title || "";
    const url = chapter.url || "";
    const titleMatch = title.match(/(?:chapter|ch\.?|ep\.?|episode)\s*([\d.]+)/i);
    if (titleMatch) return parseFloat(titleMatch[1]);
    const urlMatch = url.match(/[?&](?:chapter|episode(?:_no)?)=([\d.]+)/i) || url.match(/(?:chapter|episode)[-_/]([\d.]+)/i);
    if (urlMatch) return parseFloat(urlMatch[1]);
    if (/read first|start here|begin here/i.test(title)) return 1;
    const fallback = title.match(/\b([\d.]+)\b/);
    return fallback ? parseFloat(fallback[1]) : null;
  };

  const openReader = async (chUrl: string, chapterIndex?: number) => {
    if (typeof chapterIndex === "number") setCurrentChapterIndex(chapterIndex);
    vaultFlash();
    setReaderUrl(chUrl); setReaderLoading(true); setReaderError(""); setReaderImages([]); setShowNavButtons(false);
    if (readerScrollRef.current) readerScrollRef.current.scrollTop = 0;
    try {
      const res = await fetch(`/api/reader?url=${encodeURIComponent(chUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (data.images?.length > 0) setReaderImages(data.images);
      else setReaderError("No images found for this chapter.");
    } catch (err) {
      setReaderError(err instanceof Error ? err.message : "Failed to load chapter");
    } finally {
      setReaderLoading(false);
    }
  };

  const hasRealChapterList = result.chapters.length > 0;
  const currentChapter = hasRealChapterList && currentChapterIndex !== null ? result.chapters[currentChapterIndex] ?? null : null;
  const currentChapterNumber = currentChapter ? getChapterNumber(currentChapter) : null;
  const chapterEntries = hasRealChapterList
    ? result.chapters.map((chapter, index) => ({ chapter, index, number: getChapterNumber(chapter) })).filter(e => e.number !== null)
    : [];
  const prevEntry = currentChapterNumber === null ? null
    : chapterEntries.filter(e => (e.number as number) < currentChapterNumber).sort((a, b) => (b.number as number) - (a.number as number))[0] ?? null;
  const nextEntry = currentChapterNumber === null ? null
    : chapterEntries.filter(e => (e.number as number) > currentChapterNumber).sort((a, b) => (a.number as number) - (b.number as number))[0] ?? null;

  /* ---- READER ---- */
  if (readerUrl) {
    return (
      <div className="reader">
        <div className="reader-bar">
          <button className="btn ghost sm" onClick={() => { setReaderUrl(null); setReaderImages([]); setReaderError(""); setCurrentChapterIndex(null); }}>← BACK</button>
          <h3 className="reader-t">{result.title}</h3>
          <button className="m-close" style={{ position: "static" }} onClick={() => { setReaderUrl(null); setResult(initialResult); }} aria-label="Close reader">✕</button>
        </div>
        {readerLoading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#888", fontSize: 11, letterSpacing: ".24em" }}>EXTRACTING PANELS…</p>
          </div>
        )}
        {readerError && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, padding: 24, textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: 13, letterSpacing: ".1em" }}>{readerError}</p>
            <button className="btn" onClick={() => { setReaderUrl(null); setReaderError(""); }}>BACK TO CHAPTERS</button>
          </div>
        )}
        {!readerLoading && !readerError && readerImages.length > 0 && (
          <>
            {prevEntry && showNavButtons && (
              <div className="reader-nav" style={{ left: 20 }}>
                <button className="btn ghost sm" onClick={() => openReader(prevEntry.chapter.url, prevEntry.index)}>← PREV</button>
              </div>
            )}
            {nextEntry && showNavButtons && (
              <div className="reader-nav" style={{ right: 20 }}>
                <button className="btn ghost sm" onClick={() => openReader(nextEntry.chapter.url, nextEntry.index)}>NEXT →</button>
              </div>
            )}
            <div ref={readerScrollRef} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
              <div style={{ maxWidth: 768, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {readerImages.map((src, i) => (
                  <img key={i} src={src} alt={`Page ${i + 1}`} style={{ width: "100%", height: "auto", userSelect: "none" }} loading={i < 3 ? "eager" : "lazy"} referrerPolicy="no-referrer" draggable={false} />
                ))}
                <div style={{ padding: "40px 0 60px", textAlign: "center" }}>
                  <p style={{ color: "#888", fontSize: 10, letterSpacing: ".24em", marginBottom: 18 }}>END OF CHAPTER</p>
                  <button className="btn" onClick={() => { setReaderUrl(null); setReaderImages([]); setCurrentChapterIndex(null); }}>BACK TO CHAPTERS</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---- DETAIL PANEL ---- */
  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="SEC.XX" as="h1" title={<>{result.type}<br />{result.title.toUpperCase()}</>} right={`${result.chapterCount} CHAPTERS`} />

        <div className="m-grid">
          <div className="m-cover">
            {result.coverUrl
              ? <img src={result.coverUrl} alt="" referrerPolicy="no-referrer" />
              : <span className="cover-fallback">{result.title.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="m-body">
            <p className="m-kicker">{result.type} · {result.source}</p>
            <h3 className="m-title">{result.title}</h3>
            <div className="m-stats">
              {result.rating !== "N/A" && <span>RATING <b>★ {result.rating}</b></span>}
              <span>CHAPTERS <b>{result.chapterCount}</b></span>
              <span>STATUS <b>{result.status}</b></span>
              {result.author !== "Unknown" && <span>AUTHOR <b>{result.author}</b></span>}
            </div>
            {result.genres.length > 0 && (
              <div className="tags" style={{ marginTop: 12 }}>
                {result.genres.map(g => <span key={g} className="tag">{g}</span>)}
              </div>
            )}
            <p className="m-syn">{result.description}</p>
            <p className="m-ch-h">CHAPTERS ({result.chapterCount})</p>
            <ul className="m-ch">
              {hasRealChapterList ? result.chapters.map((ch, i) => (
                <li key={i} style={{ padding: 0, border: 0 }}>
                  <button onClick={() => openReader(ch.url, i)}>
                    <span>{ch.title}</span>
                    <span className="ch-date">{ch.date || "—"}</span>
                  </button>
                </li>
              )) : (
                <li>
                  <span>CHAPTER LIST NOT AVAILABLE YET</span>
                  <span className="ch-date">
                    <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: "#888" }}>VISIT SOURCE ↗</a>
                  </span>
                </li>
              )}
            </ul>
            {hasRealChapterList && (
              <div className="m-actions">
                <button className="btn" onClick={() => openReader(result.chapters[0].url, 0)}>READ LATEST</button>
                <button className="btn ghost" onClick={() => openReader(result.chapters[result.chapters.length - 1].url, result.chapters.length - 1)}>START CH. 1</button>
              </div>
            )}
            <p style={{ marginTop: 24, color: "#555", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" }}>
              <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: "#888" }}>VIEW ON {result.source.toUpperCase()} ↗</a>
            </p>
          </div>
        </div>
      </section>
    </VaultShell>
  );
}