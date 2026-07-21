"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";
import MangaCard, { useReveal, type MangaResult } from "@/components/vault/MangaCard";
import { vaultFlash } from "@/components/vault/VaultFX";

export type { MangaResult };

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

const MARQUEE = "NOW INDEXING ✦ ASURA SCANS ✦ MANGANATO ✦ WEBTOONS ✦ OMEGA SCANS ✦ DEMONIC SCANS ✦ SCYTHE SCANS ✦ MANHUATOP ✦ ";

export default function HomeClient({ initialTrending }: { initialTrending: MangaResult[] }) {
  const [trending, setTrending] = useState<MangaResult[]>(initialTrending);
  const [selected, setSelected] = useState<MangaResult | null>(null);

  // If SSR returned nothing, fall back to the client API
  useEffect(() => {
    if (initialTrending.length > 0) return;
    (async () => {
      try {
        const res = await fetch("/api/trending?page=1");
        if (res.ok) {
          const d = await res.json();
          setTrending((d.results || []).slice(0, 20));
        }
      } catch { /* */ }
    })();
  }, [initialTrending.length]);

  const open = (r: MangaResult) => setSelected(r);
  const featured = trending[0];
  const strip = trending.slice(0, 8);
  const latest = trending.slice(0, 8);

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
            <div className="h-cta">
              <Link href="/browse" className="btn" onClick={() => vaultFlash()}>START READING</Link>
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
            <div className="empty">LOADING THE VAULT…</div>
          )}
        </div>

        {/* ---------- LATEST DROPS ---------- */}
        <div className="wrap">
          <SectionHead idx="SEC.02" title={<>LATEST<br />DROPS</>} right="UPDATED HOURLY" />
          <div className="lgrid">
            {latest.map((r, i) => (
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
                85,000+ TITLES IN THE VAULT
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
          <span>{result.source.toUpperCase()}</span>
        </span>
      </span>
      <span className="arr">→</span>
    </button>
  );
}
