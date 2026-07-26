"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";
import MangaCard, { useReveal, type MangaResult } from "@/components/vault/MangaCard";
import { vaultFlash } from "@/components/vault/VaultFX";
import { Loader } from "@/components/vault/Loader";

export type { MangaResult };

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

const MARQUEE = "NOW INDEXING ✦ MANGA ✦ MANHWA ✦ MANHUA ✦ WEBTOON ✦ ";

export default function HomeClient({ initialTrending, totalTitles }: { initialTrending: MangaResult[]; totalTitles?: number }) {
  const router = useRouter();
  const [trending, setTrending] = useState<MangaResult[]>(initialTrending);
  const [latest, setLatest] = useState<MangaResult[]>([]);
  const [selected, setSelected] = useState<MangaResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      vaultFlash();
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // If SSR returned nothing, fall back to the client API
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
  }, [initialTrending.length]);

  // Fetch latest drops (sorted by updatedAt desc)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trending?page=1&sort=latest");
        if (res.ok) {
          const d = await res.json();
          setLatest((d.results || []).slice(0, 8));
        }
      } catch { /* */ }
    })();
  }, []);

  const open = (r: MangaResult) => setSelected(r);
  // Trending = popularity proxy (rating desc, then chapter count)
  const strip = [...trending]
    .sort((a, b) => {
      const ra = a.rating === "N/A" ? -1 : parseFloat(a.rating) || -1;
      const rb = b.rating === "N/A" ? -1 : parseFloat(b.rating) || -1;
      if (rb !== ra) return rb - ra;
      return (parseInt(b.chapterCount) || 0) - (parseInt(a.chapterCount) || 0);
    })
    .slice(0, 8);
  const featured = strip[0] || trending[0];
  // Latest drops = already sorted by updatedAt desc from API
  const latestDrops = latest.length > 0 ? latest : trending.slice(0, 8);

  return (
    <VaultShell>
      {/* ---------- HERO ---------- */}
      <section>
        <div className="hero wrap">
          <div className="hero-l">
            <p className="kicker tracking-widest">MANGA · MANHWA · MANHUA · WEBTOON</p>
            <h1 className="h-title">ONE SEARCH.<br /><span className="outline">EVERY SOURCE.</span></h1>
            <p className="h-sub">
              Type a title once and MangaVault checks multiple databases in parallel —
              then merges the results into a single ranked, deduplicated list with covers,
              ratings, and chapter counts. Ink on paper. Nothing else.
            </p>
            <form onSubmit={handleSearch} style={{ marginTop: 24, marginBottom: 16 }}>
              <div className="searchbox" style={{ maxWidth: 520, margin: "0 auto 16px" }}>
                <span className="s-ic" aria-hidden="true">⌖</span>
                <input
                  id="hero-search"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="SEARCH THE VAULT…  (e.g. Solo Leveling, One Piece, Chainsaw Man)"
                  autoComplete="off"
                  aria-label="Search manga"
                  style={{ width: "100%", padding: "16px 16px 16px 48px", fontSize: 14, letterSpacing: ".1em" }}
                />
                <button type="submit" className="s-go" style={{ padding: "0 24px", fontSize: 13 }}>GO</button>
              </div>
            </form>
            <div className="h-cta">
              <Link href="/browse" className="btn" onClick={() => vaultFlash()}>BROWSE VAULT</Link>
              <Link href="/genres" className="btn ghost">BROWSE GENRES</Link>
            </div>
          </div>
          <div className="hero-r">
            {featured && (
              <MangaCard result={featured} onClick={() => open(featured)} rank="01" pop priority />
            )}
          </div>
        </div>

        <div className="mq" aria-hidden="true">
          <div className="mq-in">{MARQUEE + MARQUEE}</div>
        </div>

        {/* ---------- TRENDING ---------- */}
        <div className="wrap" id="trending">
          <SectionHead idx="SEC.01" title={<>TRENDING<br />NOW</>} right={`TOP ${String(strip.length).padStart(2, "0")} / TODAY`} />
          {strip.length > 0 ? (
            <ul className="strip">
              {strip.map((r, i) => (
                <li key={`${r.title}-${i}`} className={i === 0 ? "feat" : undefined}>
                  <MangaCard
                    result={r}
                    onClick={() => open(r)}
                    rank={String(i + 1).padStart(2, "0")}
                    pop={i === 0}
                    index={i}
                    priority={i < 3}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <Loader size={48} />
              <span>LOADING</span>
            </div>
          )}
        </div>

        {/* ---------- LATEST DROPS ---------- */}
        <div className="wrap">
          <SectionHead idx="SEC.02" title={<>LATEST<br />DROPS</>} right="UPDATED HOURLY" />
          <div className="lgrid">
            {latestDrops.map((r, i) => (
              <LatestRow key={`${r.title}-l-${i}`} result={r} index={i} onClick={() => open(r)} />
            ))}
          </div>
        </div>

        {/* ---------- BROWSE CTA ---------- */}
        <div className="wrap" style={{ marginTop: "clamp(56px, 8vh, 88px)" }}>
          <div className="vpanel" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, justifyContent: "space-between" }}>
            <div>
              <p className="kicker" style={{ margin: "0 0 8px" }}>SEC.03 — FULL CATALOG</p>
              <p style={{ margin: 0, fontWeight: 900, fontStyle: "italic", fontSize: "clamp(22px,3vw,34px)", textTransform: "uppercase", lineHeight: 0.95 }}>
                {totalTitles && totalTitles > 0
                  ? `${totalTitles.toLocaleString("en-US")}+ TITLES IN THE VAULT`
                  : "85,000+ TITLES IN THE VAULT"}
              </p>
            </div>
            <Link href="/browse" className="btn" onClick={() => vaultFlash()}>OPEN THE VAULT</Link>
          </div>
        </div>
      </section>

      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}

function LatestRow({ result, index, onClick }: { result: MangaResult; index: number; onClick: () => void }) {
  const ref = useReveal<HTMLButtonElement>(index);
  const latestCh = result.chapters[0]?.title.replace(/chapter\s*/i, "CH. ") || `CH. ${result.chapterCount !== "0" ? result.chapterCount : "—"}`;
  return (
    <button ref={ref} className="lrow reveal" onClick={onClick}>
      {result.coverUrl
        // eslint-disable-next-line @next/next/no-img-element -- tiny 46px thumb; proxied URL
        ? <img src={result.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
        : <span style={{ width: 46, height: 64, border: "2px solid #fff", flex: "none", background: "#000" }} />}
      <span className="li-info">
        <span className="li-t" style={{ display: "block" }}>{result.title}</span>
        <span className="li-m">
          <b>{latestCh.toUpperCase().slice(0, 14)}</b>
          {result.chapters[0]?.date && <span>{result.chapters[0].date.toUpperCase()}</span>}
        </span>
      </span>
      <span className="arr">→</span>
    </button>
  );
}
