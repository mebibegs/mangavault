"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";
import MangaCard, { useReveal, type MangaResult } from "@/components/vault/MangaCard";
import { vaultFlash } from "@/components/vault/VaultFX";
import { Loader } from "@/components/vault/Loader";
import { ALL_GENRES } from "@/lib/genres";
import { ADULT_GENRES } from "@/lib/safeResult";

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

interface GenresClientProps {
  initialGenre: string;
  initialQuery: string;
  initialResults: MangaResult[];
}

function GenreTile({ name, index, onClick }: { name: string; index: number; onClick: () => void }) {
  const ref = useReveal<HTMLButtonElement>(index);
  return (
    <button ref={ref} className="tile reveal" onClick={onClick}>
      <span>
        <span className="t-n" style={{ display: "block" }}>{name}</span>
        <span className="t-c" style={{ display: "block", marginTop: 10 }}>SHELF {String(index + 1).padStart(2, "0")}</span>
      </span>
      <span className="t-a">↗</span>
    </button>
  );
}

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
    } catch { /* aborted or failed */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    if (query) {
      const trimmed = query.trim();
      if (trimmed.length < 2) return;
      setResults([]);
      setTotal(0);
      setPage(1);
      fetchResults("", trimmed, 1, sort, false);
      return;
    }
    if (selectedGenre) {
      if (selectedGenre === ssrGenreRef.current && initialResults.length > 0) {
        ssrGenreRef.current = "";
        return;
      }
      setResults([]);
      setTotal(0);
      setPage(1);
      fetchResults(selectedGenre, "", 1, sort, false);
      return;
    }
    fetchResults("", "", page, sort, false);
  }, [selectedGenre, query, sort, page, fetchResults, initialResults.length]);

  const selectGenre = (g: string) => {
    vaultFlash();
    router.push(g ? `/genres?genre=${encodeURIComponent(g)}` : "/genres", { scroll: false });
  };

  const selectSort = (s: string) => {
    vaultFlash();
    setSort(s);
    setPage(1);
  };

  const clearQuery = () => {
    vaultFlash();
    router.push("/genres", { scroll: false });
  };

  /* ---- landing: genre tiles + trending ---- */
  if (!selectedGenre && !query) {
    return (
      <VaultShell>
        <section className="wrap">
          <SectionHead idx="SEC.04" as="h1" title={<>BROWSE<br />BY GENRE</>} right={`${ALL_GENRES.filter(g => !ADULT_GENRES.includes(g)).length} SHELVES`} />
          <div className="ggrid">
            {ALL_GENRES.filter(g => !ADULT_GENRES.includes(g)).map((g, i) => (
              <GenreTile key={g} name={g} index={i} onClick={() => selectGenre(g)} />
            ))}
          </div>
        </section>
      </VaultShell>
    );
  }

  /* ---- shelf / search view ---- */
  const heading = query ? <>SEARCH<br />RESULTS</> : selectedGenre ? <>{selectedGenre.toUpperCase()}<br />SHELF</> : <>BROWSE<br />THE VAULT</>;
  const rightTag = loading
    ? (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Loader size={16} strokeWidth={2} />
        <span>LOADING</span>
      </div>
    )
    : query ? `${results.length} RESULTS`
      : total > 0
        ? `${total.toLocaleString("en-US")}+ TITLES`
        : `${results.length}${hasMore ? "+" : ""} TITLES`;

  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="SEC.04" as="h1" title={heading} right={rightTag} />

        {query && (
          <p className="kicker" style={{ marginTop: -10 }}>
            QUERY: &ldquo;{query.toUpperCase()}&rdquo; — <button className="chip" style={{ padding: "4px 10px" }} onClick={clearQuery}>CLEAR ✕</button>
          </p>
        )}

        {!query && (
          <div className="chips">
            <button className={`chip${!selectedGenre ? " on" : ""}`} onClick={() => selectGenre("")}>ALL</button>
            {ALL_GENRES.filter(g => !ADULT_GENRES.includes(g)).map(g => (
              <button key={g} className={`chip${selectedGenre.toLowerCase() === g.toLowerCase() ? " on" : ""}`} onClick={() => selectGenre(g)}>{g}</button>
            ))}
          </div>
        )}

        {!query && (
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
                <button className="btn ghost sm" onClick={() => setPage(1)} disabled={page <= 1 || loadingMore}>⏮ FIRST</button>
                <button className="btn ghost sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loadingMore}>← PREV</button>
                {(() => {
                  const pages: (number | "...")[] = [];
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
                      <span key={`e${idx}`} style={{ color: "#555", fontSize: 11, letterSpacing: ".1em" }}>···</span>
                    ) : (
                      <button key={p} className={`btn ghost sm ${page === p ? "on" : ""}`} onClick={() => setPage(p)} disabled={page === p}>
                        {String(p).padStart(2, "0")}
                      </button>
                    )
                  );
                })()}
                <button className="btn ghost sm" onClick={() => { if (!loadingMore && hasMore) fetchResults(selectedGenre, query, page + 1, sort, true); }} disabled={!hasMore || loadingMore}>
                  {loadingMore ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader size={14} strokeWidth={2} />
                      <span>LOADING</span>
                    </span>
                  ) : (
                    "NEXT →"
                  )}
                </button>
                <button className="btn ghost sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages || loadingMore}>LAST ⏭</button>
                <span style={{ color: "#666", fontSize: 10, letterSpacing: ".18em", marginLeft: 8 }}>PAGE {page} / {totalPages}</span>
              </div>
            )}
          </>
        )}
      </section>

      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}