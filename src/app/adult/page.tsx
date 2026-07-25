"use client";

/* eslint-disable @next/next/no-img-element -- Reader panels must stay full-resolution and bypass Next image resizing. */
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import VaultFX, { vaultFlash } from "@/components/vault/VaultFX";
import SectionHead from "@/components/vault/SectionHead";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import { Loader } from "@/components/vault/Loader";

interface ChapterInfo { title: string; url: string; date: string; }

const ADULT_GENRES = [
  "All", "Action", "Adult", "Boys Love", "Comedy", "Doujinshi", "Drama",
  "Ecchi", "Erotica", "Fantasy", "Full Color", "Girls Love", "Harem",
  "Hentai", "Isekai", "Mature", "Netorare", "Office Workers", "Pornographic",
  "Romance", "Slice of Life", "SM BDSM", "Smut", "Supernatural", "Yaoi", "Yuri",
];

export default function AdultPage() {
  const [confirmed, setConfirmed] = useState(false);

  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedResult, setSelectedResult] = useState<MangaResult | null>(null);
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
    if (!confirmed) return;
    const timeout = window.setTimeout(() => {
      void fetchResults(submittedQuery, genre, page);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [confirmed, submittedQuery, genre, page, fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    vaultFlash();
    setPage(1);
    setSubmittedQuery(query.trim());
  };

  const openDetail = async (r: MangaResult) => {
    setSelectedResult(r);
    setLoadedChapters([]);
    const slug = r.omegaSlug || r.sourceSlug || "";
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
  };

  const openReader = async (chUrl: string) => {
    vaultFlash();
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

  /* ─── Age Gate ─── */
  if (!confirmed) {
    return (
      <>
        <VaultFX />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", zIndex: 10 }}>
          <div className="agegate">
            <p className="m-kicker" style={{ color: "#ff0000" }}>RESTRICTED SECTION — 18+</p>
            <h2 style={{ fontWeight: 900, fontStyle: "italic", fontSize: "clamp(28px,5vw,44px)", lineHeight: .95, textTransform: "uppercase", margin: "0 0 18px" }}>
              AGE<br />VERIFICATION
            </h2>
            <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.7, margin: "0 0 26px" }}>
              This section contains adult content intended for mature audiences only (18+).
              By proceeding, you confirm that you are of legal age in your jurisdiction.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                className="btn"
                onClick={() => {
                  vaultFlash();
                  setConfirmed(true);
                }}
              >
                I AM 18+ — ENTER THE VAULT
              </button>
              <Link href="/" className="btn ghost">← GO BACK</Link>
            </div>
            <img
              src="/images/anime-girl-chibi.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ position: "absolute", right: -80, bottom: -8, width: 150, filter: "grayscale(1) drop-shadow(6px 8px 0 rgba(0,0,0,.9))", pointerEvents: "none", userSelect: "none" }}
              className="hidden sm:block"
            />
          </div>
        </div>
      </>
    );
  }

  /* ─── Reader ─── */
  if (readerUrl) {
    return (
      <div className="reader">
        <div className="reader-bar">
          <button className="btn ghost sm" onClick={() => { setReaderUrl(null); setReaderImages([]); setReaderError(""); }}>← BACK</button>
          <h3 className="reader-t">{selectedResult?.title}</h3>
          <button className="m-close" style={{ position: "static" }} onClick={() => { setReaderUrl(null); setSelectedResult(null); }} aria-label="Close reader">✕</button>
        </div>
        {readerLoading && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader size={32} /></div>}
        {readerError && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <p style={{ color: "#fff", fontSize: 13 }}>{readerError}</p>
            <button className="btn" onClick={() => { setReaderUrl(null); setReaderError(""); }}>BACK</button>
          </div>
        )}
        {!readerLoading && !readerError && readerImages.length > 0 && (
          <div ref={readerScrollRef} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
            <div style={{ maxWidth: 768, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {readerImages.map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} style={{ width: "100%", height: "auto", userSelect: "none" }} loading={i < 3 ? "eager" : "lazy"} referrerPolicy="no-referrer" draggable={false} />
              ))}
              <div style={{ padding: "40px 0 60px", textAlign: "center" }}>
                <p style={{ color: "#888", fontSize: 10, letterSpacing: ".24em", marginBottom: 18 }}>END OF CHAPTER</p>
                <button className="btn" onClick={() => { setReaderUrl(null); setReaderImages([]); }}>BACK TO CHAPTERS</button>
              </div>
            </div>
          </div>
        )}
        {showNav && !readerLoading && (
          <div className="reader-nav" style={{ right: 20 }}>
            <button className="btn ghost sm" onClick={() => { setReaderUrl(null); setReaderImages([]); }}>CHAPTERS ↑</button>
          </div>
        )}
      </div>
    );
  }

  /* ─── Detail Modal ─── */
  const detailModal = selectedResult && (
    <div className="vmodal" role="dialog" aria-modal="true" aria-label={selectedResult.title}>
      <div className="m-bg" onClick={() => { setSelectedResult(null); setLoadedChapters([]); }} />
      <div className="m-panel">
        <button className="m-close" onClick={() => { setSelectedResult(null); setLoadedChapters([]); }} aria-label="Close">✕</button>
        <div className="m-grid">
          <div className="m-cover">
            {selectedResult.coverUrl
              ? <img src={selectedResult.coverUrl} alt="" referrerPolicy="no-referrer" />
              : <span className="cover-fallback">18+</span>}
          </div>
          <div className="m-body">
            <p className="m-kicker" style={{ color: "#ff0000" }}>{selectedResult.type} · 18+</p>
            <h3 className="m-title">{selectedResult.title}</h3>
            <div className="m-stats">
              {selectedResult.rating !== "N/A" && <span>RATING <b>★ {selectedResult.rating}</b></span>}
              <span>CHAPTERS <b>{selectedResult.chapterCount || "—"}</b></span>
              <span>STATUS <b>{selectedResult.status}</b></span>
            </div>
            {selectedResult.genres.length > 0 && (
              <div className="tags" style={{ marginTop: 12 }}>
                {selectedResult.genres.map(g => <span key={g} className="tag">{g}</span>)}
              </div>
            )}
            <p className="m-syn">{selectedResult.description}</p>
            <p className="m-ch-h">CHAPTERS ({selectedResult.chapterCount})</p>
            <ul className="m-ch">
              {chaptersLoading && <li><span style={{ color: "#888" }}>LOADING CHAPTERS…</span></li>}
              {!chaptersLoading && loadedChapters.length > 0 && loadedChapters.map((ch, i) => (
                <li key={i} style={{ padding: 0, border: 0 }}>
                  <button onClick={() => openReader(ch.url)}>
                    <span>{ch.title}</span>
                    <span className="ch-date">{ch.date || "—"}</span>
                  </button>
                </li>
              ))}
              {!chaptersLoading && loadedChapters.length === 0 && (
                <li><span style={{ color: "#888" }}>NO CHAPTERS AVAILABLE</span></li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Main Page ─── */
  return (
    <>
      <VaultFX />
      {/* standalone 18+ header — separate chrome from the main vault */}
      <header id="topbar">
        <Link className="logo" href="/adult">MANGAVAULT<span className="logo-dot" style={{ color: "#ff0000" }}>18+</span></Link>
        <form id="search" role="search" style={{ marginLeft: "auto" }} onSubmit={handleSearch}>
          <div className="searchbox">
            <span className="s-ic" aria-hidden="true">⌖</span>
            <input
              id="q"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="SEARCH ADULT TITLES…"
              autoComplete="off"
              aria-label="Search adult titles"
            />
            <button type="submit" className="s-go">GO</button>
          </div>
        </form>
        <Link href="/" className="btn ghost sm" style={{ flexShrink: 0 }}>← HOME</Link>
      </header>

      <div className="vault-content">
        <main className="wrap">
          <SectionHead
            idx="SEC.18+"
            as="h1"
            title={<>THE RED<br />VAULT</>}
            right={loading ? "SCANNING…" : `${total} TITLES${genre !== "All" ? ` · ${genre.toUpperCase()}` : ""}`}
          />

          <div className="mq" aria-hidden="true" style={{ marginTop: 0, marginBottom: 30 }}>
            <div className="mq-in">{"RESTRICTED SECTION ✦ 18+ ONLY ✦ MATURE CONTENT ✦ ".repeat(4)}</div>
          </div>

          {/* Genre chips */}
          <div className="chips">
            {ADULT_GENRES.map(g => (
              <button key={g} className={`chip${g === genre ? " on" : ""}`} onClick={() => { vaultFlash(); setGenre(g); setPage(1); }}>
                {g}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="empty">SCANNING THE RED VAULT…</div>
          ) : results.length === 0 ? (
            <div className="empty">NO RESULTS FOUND.</div>
          ) : (
            <div className="comic-grid">
              {results.map((r, i) => (
                <MangaCard key={`${r.title}-${i}`} result={r} onClick={() => openDetail(r)} index={i} priority={i < 4} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {(hasMore || page > 1) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 40 }}>
              <button className="btn ghost sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← PREV</button>
              <span style={{ color: "#888", fontSize: 11, letterSpacing: ".2em" }}>PAGE {String(page).padStart(2, "0")}</span>
              <button className="btn ghost sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>NEXT →</button>
            </div>
          )}
        </main>

        {detailModal}

        <footer className="vfooter wrap">
          <span className="f-word outline">RED VAULT</span>
          <div className="f-grid">
            <div>RESTRICTED SECTION<br />18+ ONLY</div>
            <div>
              <Link href="/">HOME</Link><br />
              <Link href="/privacy">PRIVACY</Link>
            </div>
            <div>
              <Link href="/terms">TERMS</Link><br />
              <Link href="/dmca">DMCA</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
