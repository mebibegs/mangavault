"use client";

/* eslint-disable @next/next/no-img-element -- Hero bg image needs raw img for CSS object-fit */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import WebtoonCarousel from "@/components/vault/WebtoonCarousel";

export type { MangaResult };

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

export default function HomeClient({ initialTrending }: { initialTrending: MangaResult[] }) {
  const [trending, setTrending] = useState<MangaResult[]>(initialTrending);
  const [newlyReleased, setNewlyReleased] = useState<MangaResult[]>(initialTrending);
  const [selected, setSelected] = useState<MangaResult | null>(null);

  useEffect(() => {
    if (initialTrending.length > 0) return;
    (async () => {
      try {
        const res = await fetch("/api/trending?page=1");
        if (res.ok) {
          const d = await res.json();
          setTrending((d.results || []).slice(0, 30));
          const shuffled = [...(d.results || [])].sort(() => Math.random() - 0.5);
          setNewlyReleased(shuffled.slice(0, 10));
        }
      } catch { /* */ }
    })();
  }, [initialTrending]);

  const byCategory = useMemo(() => {
    if (trending.length === 0) return [];
    const genresToShow = ["Drama", "Fantasy", "Action", "Romance", "Comedy"];
    const cats: { genre: string; items: MangaResult[] }[] = [];
    for (const g of genresToShow) {
      const items = trending.filter(r => r.genres.some(rg => rg.toLowerCase() === g.toLowerCase()));
      if (items.length >= 2) cats.push({ genre: g, items });
    }
    if (cats.length === 0 && trending.length > 0) {
      cats.push({ genre: "Action", items: trending });
    }
    return cats;
  }, [trending]);

  // Trending ranked list (numbered 1-10)
  const trendingRanked = [...trending].slice(0, 10);
  const popularList = trending.length > 10 ? trending.slice(10, 20) : trending.slice(0, 10);
  const newReleases = newlyReleased.length > 0 ? newlyReleased.slice(0, 10) : trending.slice(0, 10);
  const featured = trendingRanked[0] || trending[0];

  return (
    <VaultShell>
      {/* ---------- HERO ---------- */}
      {featured && (
        <section className="whero">
          <div className="whero-bg">
            {featured.coverUrl && (
              <img
                src={featured.coverUrl}
                alt=""
                aria-hidden="true"
                className="whero-bg-img"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="whero-overlay" />
          </div>
          <div className="whero-content">
            <p className="whero-eyebrow">Featured #{featured.type}</p>
            <h1 className="whero-title">{featured.title}</h1>
            <p className="whero-desc">{featured.description || "Discover more on MangaVault…"}</p>
            <button className="btn" onClick={() => setSelected(featured)}>
              Start Reading
            </button>
          </div>
        </section>
      )}

      <main className="wmain">
        {/* ---------- TRENDING & POPULAR ---------- */}
        <section className="wsection">
          <div className="grid" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Trending & Popular Series</h2>
            <Link href="/genres?sort=popular" style={{ color: "#FF0000", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>View all</Link>
          </div>
          <WebtoonCarousel>
            {trendingRanked.map((r, i) => (
              <MangaCard
                key={`${r.title}-${i}`}
                result={r}
                onClick={() => setSelected(r)}
                rank={i + 1}
                index={i}
                priority={i < 4}
              />
            ))}
          </WebtoonCarousel>
        </section>

        {/* ---------- POPULAR SECONDARY ---------- */}
        <section className="wsection">
          <div className="grid" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Popular Series</h2>
            <Link href="/genres?sort=popular" style={{ color: "#FF0000", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>View all</Link>
          </div>
          <WebtoonCarousel>
            {popularList.map((r, i) => (
              <MangaCard
                key={`${r.title}-${i}`}
                result={r}
                onClick={() => setSelected(r)}
                index={i}
              />
            ))}
          </WebtoonCarousel>
        </section>

        {/* ---------- POPULAR BY CATEGORY ---------- */}
        {byCategory.map((cat) => (
          <section className="wsection" key={cat.genre}>
            <div className="grid" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Popular Series — {cat.genre}</h2>
              <Link href={`/genres?genre=${encodeURIComponent(cat.genre)}`} style={{ color: "#FF0000", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>View all</Link>
            </div>
            <WebtoonCarousel>
              {cat.items.map((r, i) => (
                <MangaCard
                  key={`${r.title}-${i}`}
                  result={r}
                  onClick={() => setSelected(r)}
                  index={i}
                />
              ))}
            </WebtoonCarousel>
          </section>
        ))}

        {/* ---------- NEWLY RELEASED ---------- */}
        <section className="wsection">
          <div className="grid" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Newly Released</h2>
            <Link href="/genres?sort=latest" style={{ color: "#FF0000", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>View all</Link>
          </div>
          <WebtoonCarousel>
            {newReleases.map((r, i) => (
              <MangaCard
                key={`${r.title}-${i}`}
                result={r}
                onClick={() => setSelected(r)}
                index={i}
              />
            ))}
          </WebtoonCarousel>
        </section>
      </main>

      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}
