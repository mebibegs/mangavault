"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";

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
    if (items.length >= 6) return items;
    return trending.slice(0, 12);
  }, [trending, genreTab]);

  const newlyReleased = useMemo(() => {
    const shuffled = shuffleArray(trending);
    return shuffled.slice(0, 12);
  }, [trending]);

  const daily = useMemo(() => {
    return trending.slice(0, 12);
  }, [trending]);

  const displayData = trendingTab === "trending" ? trending.slice(0, 10) : popularList;
  const hero = trending[0];

  return (
    <VaultShell>
      <main className="wmain">
        {/* ===== Hero Banner ===== */}
        {hero && (
          <section className="wsection">
            <div className="whero" onClick={() => setSelected(hero)} style={{ cursor: "pointer" }}>
              <div className="whero-bg">
                {hero.coverUrl ? <img className="whero-bg-img" src={hero.coverUrl} alt="" /> : null}
              </div>
              <div className="whero-overlay" />
              <div className="whero-content">
                <p className="whero-eyebrow">Featured Series</p>
                <h1 className="whero-title">{hero.title}</h1>
                <p className="whero-desc">
                  {hero.description || hero.genres?.join(" · ") || "Read the latest episodes now"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ===== Trending & Popular Series ===== */}
        <section className="wsection">
          <div className="wsection-head">
            <h2>Trending &amp; Popular Series</h2>
            <Link href="/genres?sort=trending">View all</Link>
          </div>
          <div className="wtabs">
            <button className={`wtab${trendingTab === "trending" ? " on" : ""}`} onClick={() => setTrendingTab("trending")}>Trending</button>
            <button className={`wtab${trendingTab === "popular" ? " on" : ""}`} onClick={() => setTrendingTab("popular")}>Popular</button>
          </div>
          <div className="trending-grid" key={trendingTab}>
            {displayData.map((r, i) => (
              <MangaCard key={`${r.title}-${i}`} result={r} onClick={() => setSelected(r)} rank={i + 1} index={i} priority={i < 4} />
            ))}
          </div>
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
          <div className="category-grid" key={genreTab}>
            {genreFiltered.map((r, i) => (
              <MangaCard key={`${r.title}-${i}`} result={r} onClick={() => setSelected(r)} index={i} />
            ))}
          </div>
        </section>

        {/* ===== Newly Released ===== */}
        <section className="wsection">
          <div className="wsection-head">
            <h2>Newly Released</h2>
          </div>
          <div className="originals-scroll">
            {newlyReleased.map((r, i) => (
              <div key={i} className="original-card" onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                <MangaCard result={r} onClick={() => setSelected(r)} index={i} />
              </div>
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
          <div className="daily-grid">
            {daily.map((r, i) => (
              <MangaCard key={`${r.title}-${i}`} result={r} onClick={() => setSelected(r)} index={i} />
            ))}
          </div>
        </section>
      </main>

      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}
