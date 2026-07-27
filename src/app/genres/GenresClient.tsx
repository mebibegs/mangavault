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

export default function GenresClient({ initialGenre, initialResults }: GenresClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedGenre = searchParams.get("q") || "";

  const [results, setResults] = useState<MangaResult[]>(selectedGenre === initialGenre ? initialResults : []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MangaResult | null>(null);
  const ssrGenreRef = useRef(initialGenre);
  const abortRef = useRef<AbortController | null>(null);

  const fetchGenre = useCallback(async (genre: string, p: number, append: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (append) setLoadingMore(true);
    else { setLoading(true); setResults([]); }
    try {
      const res = await fetch(`/api/genres?q=${encodeURIComponent(genre)}&page=${p}`, { signal: ac.signal });
      if (res.ok) {
        const d = await res.json();
        const list: MangaResult[] = d.results || [];
        setResults(prev => append ? [...prev, ...list] : list);
        setHasMore(Boolean(d.hasMore) && list.length > 0);
        setPage(p);
      }
    } catch { /* aborted or failed */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    if (!selectedGenre) return;
    // Skip the fetch when we already have SSR data for this genre
    if (selectedGenre === ssrGenreRef.current && initialResults.length > 0) {
      ssrGenreRef.current = "";
      return;
    }
    fetchGenre(selectedGenre, 1, false);
  }, [selectedGenre, fetchGenre, initialResults.length]);

  const selectGenre = (g: string) => {
    vaultFlash();
    router.push(g ? `/genres?q=${encodeURIComponent(g)}` : "/genres", { scroll: false });
  };

  /* ---- index view: shelf tiles ---- */
  if (!selectedGenre) {
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

  /* ---- shelf view: one genre ---- */
  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead
          idx="SEC.04"
          as="h1"
          title={<>{selectedGenre.toUpperCase()}<br />SHELF</>}
          right={loading ? (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Loader size={16} strokeWidth={2} />
        <span>LOADING</span>
      </div>
    ) : `${results.length}${hasMore ? "+" : ""} TITLES`}
        />

        <div className="chips">
          <button className="chip" onClick={() => selectGenre("")}>← ALL SHELVES</button>
          {ALL_GENRES.filter(g => !ADULT_GENRES.includes(g)).map(g => (
            <button
              key={g}
              className={`chip${g.toLowerCase() === selectedGenre.toLowerCase() ? " on" : ""}`}
              onClick={() => selectGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <Loader size={40} strokeWidth={3} />
          </div>
        ) : results.length === 0 ? (
          <div className="empty" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ marginBottom: 16 }}>SHELF &ldquo;{selectedGenre.toUpperCase()}&rdquo; IS EMPTY OR DOES NOT EXIST.</p>
            <button className="btn" onClick={() => selectGenre("")}>BROWSE ALL SHELVES</button>
          </div>
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
                <button className="btn ghost" disabled={loadingMore} onClick={() => fetchGenre(selectedGenre, page + 1, true)}>
                  {loadingMore ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader size={14} strokeWidth={2} />
                      <span>LOADING</span>
                    </span>
                  ) : (
                    "LOAD MORE ↓"
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
