"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import WebtoonCarousel from "@/components/vault/WebtoonCarousel";

export type { MangaResult };

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

const GENRE_TABS = ["Drama", "Fantasy", "Comedy", "Action", "Romance"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Completed"];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(hashCode(String(i))) % (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export default function HomeClient({ initialTrending }: { initialTrending: MangaResult[] }) {
  const [trending, setTrending] = useState<MangaResult[]>(initialTrending);
  const [selected, setSelected] = useState<MangaResult | null>(null);
  const [trendingTab, setTrendingTab] = useState<"trending" | "popular">("trending");
  const [genreTab, setGenreTab] = useState(GENRE_TABS[0]);

  useEffect(() => {
    if (initialTrending.length > 0) return;
    (async () => {
      try {
        const res = await fetch("/api/trending?page=1");
        if (res.ok) {
          const d = await res.json();
          setTrending((d.results || []).slice(0, 30));
        }
      } catch { /* */ }
    })();
  }, [initialTrending]);

  const popularList = useMemo(() => {
    if (trending.length >= 20) return trending.slice(10, 20);
    return trending.slice(0, Math.min(10, trending.length));
  }, [trending]);

  const genreFiltered = useMemo(() => {
    const items = trending.filter(r => r.genres.some(g => g.toLowerCase() === genreTab.toLowerCase()));
    return items.length >= 4 ? items : trending.slice(0, 10);
  }, [trending, genreTab]);

  const newlyReleased = useMemo(() => {
    const shuffled = shuffleArray(trending);
    return shuffled.slice(0, 10);
  }, [trending]);

  const daily = useMemo(() => {
    return trending.slice(0, 10);
  }, [trending]);

  const canvas = useMemo(() => {
    const shuffled = shuffleArray(trending);
    return shuffled.slice(0, 12);
  }, [trending]);

  const displayData = trendingTab === "trending" ? trending.slice(0, 10) : popularList;

  return (
    <VaultShell>
      <main className="wmain">
        {/* ===== Trending & Popular Series ===== */}
        <section className="wsection">
          <div className="wsection-head">
            <h2>Trending &amp; Popular Series</h2>
            <Link href="/genres?sort=trending">Trending View all</Link>
          </div>
          <div className="wtabs">
            <button className={`wtab${trendingTab === "trending" ? " on" : ""}`} onClick={() => setTrendingTab("trending")}>Trending</button>
            <button className={`wtab${trendingTab === "popular" ? " on" : ""}`} onClick={() => setTrendingTab("popular")}>Popular</button>
          </div>
          <WebtoonCarousel key={trendingTab}>
            {displayData.map((r, i) => (
              <MangaCard key={`${r.title}-${i}`} result={r} onClick={() => setSelected(r)} rank={i + 1} index={i} priority={i < 4} />
            ))}
          </WebtoonCarousel>
        </section>

        {/* ===== Now on MangaVault (banner) ===== */}
        <section className="wsection">
          <Link href="/genres" style={{ display: "block", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", borderRadius: 12, padding: "32px 40px", textDecoration: "none", color: "#fff" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 8px", opacity: .7 }}>Click to read stories on MangaVault!</p>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>One search across every source</p>
          </Link>
        </section>

        {/* ===== Popular Series by Category ===== */}
        <section className="wsection">
          <div className="wsection-head">
            <h2>Popular Series by Category</h2>
            <Link href={`/genres?genre=${genreTab}`}>View all</Link>
          </div>
          <div className="wtabs">
            {GENRE_TABS.map(g => (
              <button key={g} className={`wtab${genreTab === g ? " on" : ""}`} onClick={() => setGenreTab(g)}>{g}</button>
            ))}
          </div>
          <WebtoonCarousel key={genreTab}>
            {genreFiltered.map((r, i) => (
              <MangaCard key={`${r.title}-${i}`} result={r} onClick={() => setSelected(r)} index={i} />
            ))}
          </WebtoonCarousel>
        </section>

        {/* ===== Newly Released ===== */}
        <section className="wsection">
          <div className="wsection-head">
            <h2>Newly Released</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {newlyReleased.map((r, i) => (
              <button key={i} className="wt-card-sm" onClick={() => setSelected(r)} aria-label={r.title}>
                <span className="wcard-cover-wrap" style={{ aspectRatio: "2/3", marginBottom: 0 }}>
                  <span className="wcard-cover-clip">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="wcard-fallback">{r.title.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ===== Daily ===== */}
        <section className="wsection">
          <div className="wsection-head">
            <h2>Daily</h2>
            <Link href="/genres">View all</Link>
          </div>
          <div className="wtabs">
            {DAYS.map(d => (
              <button key={d} className={`wtab${d === "Mon" ? " on" : ""}`}>{d}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {daily.map((r, i) => (
              <button key={i} className="wt-card-sm" onClick={() => setSelected(r)} aria-label={r.title} style={{ width: "100%" }}>
                <span className="wcard-cover-wrap" style={{ marginBottom: 6 }}>
                  <span className="wcard-cover-clip">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="wcard-fallback">{r.title.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                </span>
                <span className="wt-up-badge">UP</span>
                {r.genres.length > 0 && <span className="wcard-genre">{r.genres[0]}</span>}
                <h3 className="wcard-title">{r.title}</h3>
              </button>
            ))}
          </div>
        </section>

        {/* ===== Canvas: More stories ===== */}
        <section className="wsection">
          <div className="wsection-head">
            <h2>More stories from indie creators</h2>
            <Link href="/genres">View all</Link>
          </div>
          <WebtoonCarousel>
            {canvas.map((r, i) => (
              <button key={i} className="wt-card-sm" onClick={() => setSelected(r)} aria-label={r.title}>
                <span className="wcard-cover-wrap">
                  <span className="wcard-cover-clip">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="wcard-fallback">{r.title.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                </span>
                <h3 className="wcard-title" style={{ fontSize: 12, marginTop: 6 }}>{r.title}</h3>
              </button>
            ))}
          </WebtoonCarousel>
        </section>
      </main>

      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}
