"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import { vaultFlash } from "@/components/vault/VaultFX";
import { Loader } from "@/components/vault/Loader";
import { ALL_GENRES } from "@/lib/genres";
import { ADULT_GENRES } from "@/lib/safeResult";

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

export default function BrowseClient() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") || "";
  const genre = params.get("genre") || "";
  const sort = params.get("sort") || "updated";
  const rawPage = parseInt(params.get("page") || "1", 10) || 1;
  const validPage = Math.max(1, Math.min(660, rawPage));

  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MangaResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / 30));

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (append) setLoadingMore(true);
    else { setLoading(true); setResults([]); }
    try {
      let url: string;
      if (q) url = `/api/search?q=${encodeURIComponent(q)}`;
      else if (genre) url = `/api/genres?q=${encodeURIComponent(genre)}&page=${p}&sort=${encodeURIComponent(sort)}`;
      else url = `/api/trending?page=${p}&sort=${encodeURIComponent(sort)}`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      const list: MangaResult[] = d.results || [];
      setResults(prev => append ? [...prev, ...list] : list);
      setHasMore(q ? false : Boolean(d.hasMore) && list.length > 0);
      setTotal(typeof d.total === "number" ? d.total : 0);
      setPage(p);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (!append) { setResults([]); setHasMore(false); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [q, genre, sort]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void fetchPage(validPage, false); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchPage, validPage]);

  const selectGenre = (g: string) => {
    vaultFlash();
    router.push(g ? `/browse?genre=${encodeURIComponent(g)}` : "/browse", { scroll: false });
  };

  const selectSort = (s: string) => {
    vaultFlash();
    const sp = new URLSearchParams(params.toString());
    sp.set("sort", s);
    router.push(`/browse?${sp.toString()}`, { scroll: false });
  };

  const heading = q ? <>SEARCH<br />RESULTS</> : genre ? <>{genre.toUpperCase()}<br />SHELF</> : <>BROWSE<br />THE VAULT</>;
  const rightTag = loading
    ? (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Loader size={16} strokeWidth={2} />
        <span>LOADING</span>
      </div>
    )
    : total > 0
      ? `${total.toLocaleString("en-US")}+ TITLES`
      : `${results.length}${hasMore ? "+" : ""} TITLES`;

  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="SEC.03" as="h1" title={heading} right={rightTag} />

        {q && (
          <p className="kicker" style={{ marginTop: -10 }}>
            QUERY: &ldquo;{q.toUpperCase()}&rdquo; — <button className="chip" style={{ padding: "4px 10px" }} onClick={() => router.push("/browse", { scroll: false })}>CLEAR ✕</button>
          </p>
        )}

        {!q && (
          <div className="chips">
            <button className={`chip${!genre ? " on" : ""}`} onClick={() => selectGenre("")}>ALL</button>
            {ALL_GENRES.filter(g => !ADULT_GENRES.includes(g)).map(g => (
              <button key={g} className={`chip${genre.toLowerCase() === g.toLowerCase() ? " on" : ""}`} onClick={() => selectGenre(g)}>{g}</button>
            ))}
          </div>
        )}

        {!q && (
          <div className="chips" style={{ marginTop: 20, marginBottom: 20 }}>
            <span style={{ color: "#888", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", marginRight: 12 }}>SORT:</span>
            {["updated", "popular", "title", "rating", "chapters"].map(s => (
              <button key={s} className={`chip${sort === s ? " on" : ""}`} onClick={() => selectSort(s)}>{s.toUpperCase()}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Loader size={48} />
            <span>LOADING</span>
          </div>
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
            {(hasMore || page > 1) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 40, flexWrap: "wrap" }}>
                <button className="btn ghost sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loadingMore}>← PREV</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`btn ghost sm ${page === pageNum ? "on" : ""}`}
                      onClick={() => setPage(pageNum)}
                      disabled={page === pageNum}
                    >
                      {String(pageNum).padStart(2, "0")}
                    </button>
                  );
                })}
                <button className="btn ghost sm" onClick={() => { if (!loadingMore && hasMore) fetchPage(page + 1, true); }} disabled={!hasMore || loadingMore}>
                  {loadingMore ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader size={14} strokeWidth={2} />
                      <span>LOADING</span>
                    </span>
                  ) : (
                    "NEXT →"
                  )}
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
