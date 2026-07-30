"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import { Loader } from "@/components/vault/Loader";
import { ALL_GENRES } from "@/lib/genres";
import { ADULT_GENRES } from "@/lib/safeResult";

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

interface GenresClientProps {
  initialGenre: string;
  initialQuery: string;
  initialResults: MangaResult[];
}

const SORT_OPTIONS = ["updated", "popular", "title", "rating", "chapters"];

export default function GenresClient({ initialGenre, initialQuery, initialResults }: GenresClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedGenre = searchParams.get("genre") || "";
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<MangaResult[]>(selectedGenre === initialGenre && initialResults.length > 0 ? initialResults : []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("updated");
  const [selected, setSelected] = useState<MangaResult | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / 30));
  const abortRef = useRef<AbortController | null>(null);
  const ssrGenreRef = useRef(initialGenre);

  const fetchResults = useCallback(async (g: string, q: string, p: number, s: string, append: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (append) setLoadingMore(true);
    else { setLoading(true); setResults([]); }
    try {
      let url: string;
      if (q) url = `/api/search?q=${encodeURIComponent(q)}`;
      else if (g) url = `/api/genres?q=${encodeURIComponent(g)}&page=${p}&sort=${encodeURIComponent(s)}`;
      else url = `/api/trending?page=${p}&sort=${encodeURIComponent(s)}`;
      const res = await fetch(url, { signal: ac.signal });
      if (res.ok) {
        const d = await res.json();
        const list: MangaResult[] = d.results || [];
        setResults(prev => append ? [...prev, ...list] : list);
        setHasMore(q ? false : Boolean(d.hasMore) && list.length > 0);
        setTotal(typeof d.total === "number" ? d.total : 0);
        setPage(p);
      }
    } catch { /* */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    if (query) {
      const trimmed = query.trim();
      if (trimmed.length < 2) return;
      setResults([]); setTotal(0); setPage(1);
      fetchResults("", trimmed, 1, sort, false);
      return;
    }
    if (selectedGenre) {
      if (selectedGenre === ssrGenreRef.current && initialResults.length > 0) {
        ssrGenreRef.current = "";
        return;
      }
      setResults([]); setTotal(0); setPage(1);
      fetchResults(selectedGenre, "", 1, sort, false);
      return;
    }
    fetchResults("", "", page, sort, false);
  }, [selectedGenre, query, sort, page, fetchResults, initialResults.length]);

  const selectGenre = (g: string) => {
    router.push(g ? `/genres?genre=${encodeURIComponent(g)}` : "/genres", { scroll: false });
  };

  const selectSort = (s: string) => {
    setSort(s);
    setPage(1);
  };

  const clearQuery = () => {
    router.push("/genres", { scroll: false });
  };

  /* landing: genre browsing */
  if (!selectedGenre && !query) {
    return (
      <VaultShell>
        <main className="wmain">
          <section className="wsection">
            <div className="wsection-head">
              <h2>Categories</h2>
            </div>
            <div className="wtabs" style={{ borderBottom: "none", flexWrap: "wrap", gap: 8 }}>
              {ALL_GENRES.filter(g => !ADULT_GENRES.includes(g)).map(g => (
                <button key={g} className="wt-header-btn" style={{ fontSize: 13, fontWeight: 600 }} onClick={() => selectGenre(g)}>{g}</button>
              ))}
            </div>
          </section>

          {results.length > 0 && (
            <section className="wsection">
              <div className="wsection-head">
                <h2>Trending</h2>
              </div>
              <div className="wcard-grid">
                {results.slice(0, 10).map((r, i) => (
                  <MangaCard key={`${r.title}-${i}`} result={r} onClick={() => setSelected(r)} rank={i + 1} index={i} priority={i < 4} />
                ))}
              </div>
            </section>
          )}
        </main>
        {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
      </VaultShell>
    );
  }

  /* search / genre results view */
  return (
    <VaultShell>
      <main className="wmain">
        <section className="wsection">
          <div className="wsection-head">
            <h2>{query ? `Search: ${query}` : selectedGenre ? selectedGenre : "Browse"}</h2>
            {!loading && <span style={{ fontSize: 13, color: "#999" }}>{results.length} results</span>}
          </div>

          {query && (
            <p style={{ fontSize: 13, color: "#999", margin: "-8px 0 16px" }}>
              <button onClick={clearQuery} style={{ background: "none", border: "1px solid #ddd", borderRadius: 4, padding: "2px 10px", fontSize: 12, color: "#666", cursor: "pointer" }}>Clear ✕</button>
            </p>
          )}

          {!query && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              <button className={`wt-header-btn${!selectedGenre ? " primary" : ""}`} onClick={() => selectGenre("")}>All</button>
              {ALL_GENRES.filter(g => !ADULT_GENRES.includes(g)).map(g => (
                <button key={g} className={`wt-header-btn${selectedGenre.toLowerCase() === g.toLowerCase() ? " primary" : ""}`} onClick={() => selectGenre(g)}>{g}</button>
              ))}
            </div>
          )}

          {!query && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginRight: 4 }}>Sort:</span>
              {SORT_OPTIONS.map(s => (
                <button key={s} className={`wt-header-btn${sort === s ? " primary" : ""}`} onClick={() => selectSort(s)} style={{ fontSize: 12 }}>{s}</button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 0" }}>
              <Loader size={24} />
              <span style={{ color: "#999", fontSize: 13 }}>Loading...</span>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#999", fontSize: 14 }}>
              No results found. Try a different search or category.
            </div>
          ) : (
            <>
              <div className="wcard-grid">
                {results.map((r, i) => (
                  <MangaCard key={`${r.title}-${r.source}-${i}`} result={r} onClick={() => setSelected(r)} index={i} priority={i < 4} />
                ))}
              </div>
              {(hasMore || page > 1) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32, flexWrap: "wrap" }}>
                  <button className="wt-header-btn" onClick={() => setPage(1)} disabled={page <= 1 || loadingMore}>First</button>
                  <button className="wt-header-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loadingMore}>Prev</button>
                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (page > 3) pages.push("...");
                      const start = Math.max(2, page - 1);
                      const end = Math.min(totalPages - 1, page + 1);
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (page < totalPages - 2) pages.push("...");
                      pages.push(totalPages);
                    }
                    return pages.map((p, idx) =>
                      p === "..." ? (
                        <span key={`e${idx}`} style={{ color: "#ccc", fontSize: 12 }}>...</span>
                      ) : (
                        <button key={p} className={`wt-header-btn${page === p ? " primary" : ""}`} onClick={() => setPage(p as number)} disabled={page === p} style={{ minWidth: 32, justifyContent: "center" }}>
                          {p}
                        </button>
                      )
                    );
                  })()}
                  <button className="wt-header-btn" onClick={() => { if (!loadingMore && hasMore) fetchResults(selectedGenre, query, page + 1, sort, true); }} disabled={!hasMore || loadingMore}>
                    {loadingMore ? "Loading..." : "Next"}
                  </button>
                  <button className="wt-header-btn" onClick={() => setPage(totalPages)} disabled={page >= totalPages || loadingMore}>Last</button>
                  <span style={{ color: "#999", fontSize: 11, marginLeft: 8 }}>Page {page} / {totalPages}</span>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}
