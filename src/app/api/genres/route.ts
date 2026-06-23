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

    // Fallback
    const [browseResults, searchResults, webtoonGenre] = await Promise.allSettled([
      Promise.all([browseCatalog(1), browseCatalog(2), browseCatalog(3)]),
      searchAllSources(genreTerm),
      scrapeWebtoonGenreByName(genreTerm),
    ]);
    const pool: MangaResult[] = [];
    if (browseResults.status === "fulfilled") for (const r of browseResults.value) pool.push(...r.results);
    if (searchResults.status === "fulfilled") pool.push(...searchResults.value);
    if (webtoonGenre.status === "fulfilled") pool.push(...webtoonGenre.value);

    const seen = new Set<string>();
    const unique: MangaResult[] = [];
    for (const r of pool) {
      const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length > 2 && !seen.has(key)) { seen.add(key); unique.push(r); }
    }
    const matched = unique.filter((r) => {
      const desc = normalizeGenre(r.description);
      const type = normalizeGenre(r.type);
      return r.genres.some((g) => { const gl = normalizeGenre(g); return gl.includes(genreLower) || genreLower.includes(gl); }) || type.includes(genreLower) || desc.includes(genreLower);
    });
    const finalResults = matched.length >= 3 ? matched : unique;
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
