import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { browseCatalog, searchAllSources, type MangaResult } from "@/lib/scraper";
import { scrapeWebtoonGenreByName } from "@/lib/webtoon-genres";
import { upsertResults } from "@/lib/sync";
import { toSafeResult } from "@/lib/safeResult";

function normalizeGenre(g: string): string {
  return g.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const genre = req.nextUrl.searchParams.get("q");
  if (!genre || genre.trim().length < 2) {
    return NextResponse.json({ error: "Bad Request", message: "Query parameter 'q' is required (min 2 chars)." }, { status: 400 });
  }

  const genreTerm = genre.trim();
  const genreLower = normalizeGenre(genreTerm);

  try {
    const db = await getMongoDb();
    if (db) {
      const titles = db.collection("titles");
      const total = await titles.countDocuments();
      if (total > 0) {
        const regex = new RegExp(genreLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const results = await titles.find({ $or: [{ genres: regex }, { type: regex }, { description: regex }], source: { $ne: "Omega Scans" } }).sort({ rating: -1, updatedAt: -1 }).limit(200).toArray();
        if (results.length >= 5) {
          return NextResponse.json({
            success: true,
            genre: genreTerm,
            results: results.map((d) => toSafeResult(d as Record<string, unknown>)),
            count: results.length,
            source: "cache",
          });
        }
      }
    }

    // Fallback: fire all sources in parallel with individual timeouts so one
    // slow source doesn't block the whole response
    const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);

    type CatalogPage = { results: MangaResult[]; hasMore: boolean };
    const emptyPages: [CatalogPage, CatalogPage, CatalogPage] = [
      { results: [], hasMore: false },
      { results: [], hasMore: false },
      { results: [], hasMore: false },
    ];

    const [browseResults, searchResults, webtoonGenre] = await Promise.allSettled([
      withTimeout(
        Promise.all([browseCatalog(1), browseCatalog(2), browseCatalog(3)]),
        12_000,
        emptyPages
      ),
      withTimeout(searchAllSources(genreTerm), 12_000, [] as MangaResult[]),
      withTimeout(scrapeWebtoonGenreByName(genreTerm), 8_000, [] as MangaResult[]),
    ]);
    const pool: MangaResult[] = [];
    if (browseResults.status === "fulfilled" && Array.isArray(browseResults.value)) {
      for (const r of browseResults.value as CatalogPage[]) pool.push(...(r.results || []));
    }
    if (searchResults.status === "fulfilled") pool.push(...(searchResults.value as MangaResult[]));
    if (webtoonGenre.status === "fulfilled") pool.push(...(webtoonGenre.value as MangaResult[]));

    const seen = new Set<string>();
    const unique: MangaResult[] = [];
    for (const r of pool) {
      const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length > 2 && !seen.has(key)) { seen.add(key); unique.push(r); }
    }

    // Try strict genre match first, then loose, then return everything
    const matched = unique.filter((r) => {
      const desc = normalizeGenre(r.description);
      const type = normalizeGenre(r.type);
      return r.genres.some((g) => { const gl = normalizeGenre(g); return gl.includes(genreLower) || genreLower.includes(gl); }) || type.includes(genreLower) || desc.includes(genreLower);
    });
    // Always return something — prefer matched, fall back to all unique results
    const finalResults = matched.length >= 3 ? matched : unique.length > 0 ? unique : [];
    if (unique.length > 0) upsertResults(unique).catch(() => {});

    return NextResponse.json({
      success: true,
      genre: genreTerm,
      results: finalResults.map((r) => toSafeResult(r as unknown as Record<string, unknown>)),
      count: finalResults.length,
      source: "live",
    });
  } catch {
    return NextResponse.json({ error: "Failed to search genre" }, { status: 500 });
  }
}
