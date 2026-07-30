"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import VaultShell from "@/components/vault/VaultShell";
import MangaCard, { type MangaResult } from "@/components/vault/MangaCard";
import { Loader } from "@/components/vault/Loader";

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
  const inputRef = useRef<HTMLInputElement>(null);

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
      setResults([]); setSearched(false); setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true); setSearched(true);
    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        if (!res.ok) throw new Error("fetch failed");
        const d = await res.json();
        setResults(d.results || []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults([]);
      } finally { setLoading(false); }
    })();
    return () => ac.abort();
  }, [q]);

  return (
    <VaultShell>
      <main className="wmain">
        <section className="wsection">
          <div className="wsection-head">
            <h2>Search</h2>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search titles..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              aria-label="Search manga"
              style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none" }}
            />
            <button type="submit" className="wt-header-btn primary" style={{ padding: "10px 20px" }}>Search</button>
          </form>

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <Loader size={24} />
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#999", fontSize: 14 }}>
              No results found. Try a different query.
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>{results.length} results for &ldquo;{q}&rdquo;</p>
              <div className="results-grid">
                {results.map((r, i) => (
                  <MangaCard key={`${r.title}-${r.source}-${i}`} result={r} onClick={() => setSelected(r)} index={i} priority={i < 4} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      {selected && <DetailModal result={selected} onClose={() => setSelected(null)} />}
    </VaultShell>
  );
}
