"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import VaultShell from "@/components/vault/VaultShell";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import ReaderPanel from "@/components/ReaderPanel";

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
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const [loadedChapters, setLoadedChapters] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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
    setReaderUrl(chUrl); setReaderLoading(true); setReaderError(""); setReaderImages([]);
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

  const goToChapter = (index: number) => {
    const ch = result.chapters[index];
    if (ch) openReader(ch.url, index);
  };

  const handleReaderBack = () => {
    setReaderUrl(null);
    setReaderImages([]);
    setReaderLoading(false);
    setReaderError("");
    setCurrentChapterIndex(null);
  };

  return (
    <VaultShell>
      <main className="wmain">
        {readerUrl ? (
          <div className="reader">
            <div className="reader-bar">
              <button onClick={handleReaderBack} style={{ background: "none", border: "1px solid #333", color: "#fff", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>← Back</button>
              <span className="reader-t">{result.title} — {currentChapter?.title || "Reader"}</span>
            </div>
            <div ref={readerScrollRef} style={{ flex: 1, overflowY: "auto", background: "#000" }}>
              {readerLoading && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#666", fontSize: 14 }}>Loading...</div>
              )}
              {readerError && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
                  <p style={{ color: "#ff6b6b", fontSize: 14 }}>{readerError}</p>
                  <button className="wt-header-btn" style={{ color: "#fff", background: "#333" }} onClick={() => currentChapter && openReader(currentChapter.url)}>Retry</button>
                </div>
              )}
              {!readerLoading && !readerError && readerImages.map((img, i) => (
                <ReaderPanel key={i} src={img} index={i} eager={i < 3} />
              ))}
            </div>
            {hasRealChapterList && (
              <div className="reader-nav" style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 95, display: "flex", gap: 12 }}>
                <button className="wt-header-btn" style={{ color: "#fff", background: "rgba(255,255,255,.1)" }} onClick={() => goToChapter(Math.max(0, (currentChapterIndex ?? 0) - 1))} disabled={!currentChapterIndex}>← Prev</button>
                <button className="wt-header-btn" style={{ color: "#fff", background: "rgba(255,255,255,.1)" }} onClick={() => goToChapter(Math.min(result.chapters.length - 1, (currentChapterIndex ?? 0) + 1))} disabled={(currentChapterIndex ?? 0) >= result.chapters.length - 1}>Next →</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <section style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 32 }}>
              <div style={{ flex: "0 0 220px" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "2/3", borderRadius: 8, overflow: "hidden", background: "#f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
                  {result.coverUrl ? (
                    <img src={result.coverUrl} alt={result.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#ccc" }}>{result.title.slice(0, 1)}</div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 6px" }}>{result.type || "Series"}</p>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.2 }}>{result.title}</h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {result.genres.map(g => (
                    <Link key={g} href={`/genres?genre=${encodeURIComponent(g)}`} style={{ background: "#f0f0f0", padding: "4px 12px", borderRadius: 4, fontSize: 12, color: "#666", textDecoration: "none", fontWeight: 500 }}>{g}</Link>
                  ))}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "#666", margin: "0 0 16px", maxWidth: 560 }} dangerouslySetInnerHTML={{ __html: result.description }} />
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#888", marginBottom: 16 }}>
                  {result.author && <span><strong style={{ color: "#1e1e1e" }}>Author:</strong> {result.author}</span>}
                  {result.artist && <span><strong style={{ color: "#1e1e1e" }}>Artist:</strong> {result.artist}</span>}
                  <span><strong style={{ color: "#1e1e1e" }}>Status:</strong> {result.status || "Unknown"}</span>
                  <span><strong style={{ color: "#1e1e1e" }}>Chapters:</strong> {result.chapterCount || result.chapters.length}</span>
                </div>
                <Link href={`/genres?q=${encodeURIComponent(result.title)}`} className="wt-header-btn primary" style={{ display: "inline-flex", textDecoration: "none" }}>More</Link>
              </div>
            </section>

            <section className="wsection">
              <div className="wsection-head">
                <h2>Chapters</h2>
                <span style={{ fontSize: 13, color: "#999" }}>{result.chapters.length} chapters</span>
              </div>
              {result.chapters.length === 0 ? (
                <p style={{ color: "#999", fontSize: 14, textAlign: "center", padding: "40px 0" }}>No chapters available.</p>
              ) : (
                <div style={{ borderTop: "1px solid #eee" }}>
                  {result.chapters.map((ch, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: "#1e1e1e" }}>{ch.title}</span>
                        {ch.date && <span style={{ marginLeft: 12, fontSize: 11, color: "#bbb" }}>{ch.date}</span>}
                      </div>
                      <button className="wt-header-btn" style={{ flexShrink: 0 }} onClick={() => openReader(ch.url, i)}>Read</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {result.chapters.length >= 5 && (
              <section className="wsection">
                <div className="wsection-head">
                  <h2>You may also like</h2>
                  <Link href="/genres" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>View all</Link>
                </div>
                <p style={{ color: "#ccc", fontSize: 13, fontStyle: "italic" }}>Related content coming soon...</p>
              </section>
            )}
          </>
        )}
      </main>
    </VaultShell>
  );
}
