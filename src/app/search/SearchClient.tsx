"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";

const DetailModal = dynamic(() => import("@/components/DetailModal"), { ssr: false });

export default function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") || "";

  const [input, setInput] = useState(q);
  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<MangaResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doSearch = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(input);
  };

  useEffect(() => {
    setInput(q);

    if (!q || q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setSearched(true);

    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        if (!res.ok) throw new Error("fetch failed");
        const d = await res.json();
        setResults(d.results || []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [q]);

  return (
    <VaultShell>
      <section className="wrap" style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 className="search-page-title">SEARCH</h1>

        <form onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
          <label className="search-label">
            <input
              type="text"
              className="input"
              required
              placeholder="Type here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              aria-label="Search manga"
            />
            <kbd className="slash-icon">/</kbd>
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 56.966 56.966" style={{ enableBackground: "new 0 0 512 512" } as React.CSSProperties} xmlSpace="preserve">
              <g>
                <path d="M55.146 51.887 41.588 37.786A22.926 22.926 0 0 0 46.984 23c0-12.682-10.318-23-23-23s-23 10.318-23 23 10.318 23 23 23c4.761 0 9.298-1.436 13.177-4.162l13.661 14.208c.571.593 1.339.92 2.162.92.779 0 1.518-.297 2.079-.837a3.004 3.004 0 0 0 .083-4.242zM23.984 6c9.374 0 17 7.626 17 17s-7.626 17-17 17-17-7.626-17-17 7.626-17 17-17z" fill="currentColor" />
              </g>
            </svg>
          </label>
        </form>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div className="search-loader" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="empty">NO RESULTS FOUND — TRY A DIFFERENT QUERY.</div>
        )}

        {!loading && results.length > 0 && (
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
        )}
      </section>

      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}
