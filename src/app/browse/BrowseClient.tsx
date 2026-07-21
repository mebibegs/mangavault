"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import { vaultFlash } from "@/components/vault/VaultFX";

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

const CHIP_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Harem", "Historical",
  "Horror", "Isekai", "Josei", "Martial Arts", "Mystery", "Psychological",
  "Romance", "School Life", "Sci-Fi", "Seinen", "Shoujo", "Shounen",
  "Slice of Life", "Supernatural", "Thriller", "Tragedy", "Webtoons",
];

export default function BrowseClient() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") || "";
  const genre = params.get("genre") || "";

  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MangaResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (append) setLoadingMore(true);
    else { setLoading(true); setResults([]); }
    try {
      let url: string;
      if (q) url = `/api/search?q=${encodeURIComponent(q)}`;
      else if (genre) url = `/api/genres?q=${encodeURIComponent(genre)}&page=${p}`;
      else url = `/api/trending?page=${p}`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      const list: MangaResult[] = d.results || [];
      setResults(prev => append ? [...prev, ...list] : list);
      setHasMore(q ? false : Boolean(d.hasMore) && list.length > 0);
      setPage(p);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (!append) { setResults([]); setHasMore(false); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [q, genre]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchPage(1, false); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchPage]);

  const selectGenre = (g: string) => {
    vaultFlash();
    router.push(g ? `/browse?genre=${encodeURIComponent(g)}` : "/browse", { scroll: false });
  };

  const heading = q ? <>SEARCH<br />RESULTS</> : genre ? <>{genre.toUpperCase()}<br />SHELF</> : <>BROWSE<br />THE VAULT</>;
  const rightTag = loading ? "SCANNING…" : `${results.length}${hasMore ? "+" : ""} TITLES`;

  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="SEC.03" as="h1" title={heading} right={rightTag} />

        {q && (
          <p className="kicker" style={{ marginTop: -10 }}>
            QUERY: &ldquo;{q.toUpperCase()}&rdquo; — <button className="chip" style={{ padding: "4px 10px" }} onClick={() => selectGenre("")}>CLEAR ✕</button>
          </p>
        )}

        {!q && (
          <div className="chips">
            <button className={`chip${!genre ? " on" : ""}`} onClick={() => selectGenre("")}>ALL</button>
            {CHIP_GENRES.map(g => (
              <button key={g} className={`chip${genre.toLowerCase() === g.toLowerCase() ? " on" : ""}`} onClick={() => selectGenre(g)}>{g}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty">SCANNING THE VAULT…</div>
        ) : results.length === 0 ? (
          <div className="empty">NO RESULTS FOUND — THE VAULT IS EMPTY FOR THIS QUERY.</div>
        ) : (
          <>
            <div className="comic-grid">
              {results.map((r, i) => (
                <MangaCard
                  key={`${r.title}-${r.source}-${i}`}
                  result={r}
                  onClick={() => setSelected(r)}
                  index={i}
                  priority={i < 4}
                />
              ))}
            </div>
            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
                <button className="btn ghost" disabled={loadingMore} onClick={() => fetchPage(page + 1, true)}>
                  {loadingMore ? "LOADING…" : "LOAD MORE ↓"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}
