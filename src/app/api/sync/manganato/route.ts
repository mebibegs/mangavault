import { NextRequest, NextResponse } from "next/server";
import { scrapeManganatoGenre, MANGANATO_GENRES, scrapeManganatoSitemap } from "@/lib/manganato-scraper";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 120;

/**
 * Manganato sync — split 37 genres into batches of 8.
 *
 * GET /api/sync/manganato            → all batches info
 * GET /api/sync/manganato?batch=1    → genres 0-7   (5 pages each)
 * GET /api/sync/manganato?batch=2    → genres 8-15
 * GET /api/sync/manganato?batch=3    → genres 16-23
 * GET /api/sync/manganato?batch=4    → genres 24-31
 * GET /api/sync/manganato?batch=5    → genres 32-36
 *
 * Special: ?batch=sitemap → fast sitemap scrape (titles + covers only, 10k limit)
 */

const BATCH_SIZE = 8;
const PAGES_PER_GENRE = 5; // Keep each genre scrape short
const TOTAL_BATCHES = Math.ceil(MANGANATO_GENRES.length / BATCH_SIZE);

function getBatchGenres(batch: number): string[] {
  const start = (batch - 1) * BATCH_SIZE;
  return MANGANATO_GENRES.slice(start, start + BATCH_SIZE);
}

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const batchParam = req.nextUrl.searchParams.get("batch");

  if (!batchParam) {
    return NextResponse.json({
      source: "manganato",
      totalBatches: TOTAL_BATCHES,
      totalGenres: MANGANATO_GENRES.length,
      batches: [
        ...Array.from({ length: TOTAL_BATCHES }, (_, i) => ({
          batch: i + 1,
          genres: getBatchGenres(i + 1),
          pagesPerGenre: PAGES_PER_GENRE,
        })),
        { batch: "sitemap", genres: ["all (from sitemap)"], pagesPerGenre: 0 },
      ],
      usage: "GET /api/sync/manganato?batch=1",
    });
  }

  // Special sitemap batch
  if (batchParam === "sitemap") {
    try {
      await ensureIndexes();
      const limit = Math.min(10000, parseInt(req.nextUrl.searchParams.get("limit") || "5000", 10));
      const results = await scrapeManganatoSitemap(limit);

      let inserted = 0, updated = 0;
      for (let i = 0; i < results.length; i += 500) {
        const stats = await upsertResults(results.slice(i, i + 500));
        inserted += stats.inserted;
        updated += stats.updated;
      }

      return NextResponse.json({
        success: true,
        source: "manganato",
        batch: "sitemap",
        scraped: results.length,
        inserted,
        updated,
      });
    } catch (err) {
      console.error("Manganato sitemap sync error:", err);
      return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
  }

  const batch = parseInt(batchParam, 10);
  if (batch < 1 || batch > TOTAL_BATCHES) {
    return NextResponse.json(
      { error: `Invalid batch. Use 1-${TOTAL_BATCHES} or "sitemap"` },
      { status: 400 }
    );
  }

  const genres = getBatchGenres(batch);

  try {
    await ensureIndexes();

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalScraped = 0;
    const genreStats: Record<string, number> = {};

    // Process genres sequentially to avoid hammering the server
    for (const slug of genres) {
      try {
        const results = await scrapeManganatoGenre(slug, PAGES_PER_GENRE);
        genreStats[slug] = results.length;
        totalScraped += results.length;

        if (results.length > 0) {
          const stats = await upsertResults(results);
          totalInserted += stats.inserted;
          totalUpdated += stats.updated;
        }
      } catch {
        genreStats[slug] = -1;
      }
    }

    return NextResponse.json({
      success: true,
      source: "manganato",
      batch,
      genres,
      pagesPerGenre: PAGES_PER_GENRE,
      scraped: totalScraped,
      inserted: totalInserted,
      updated: totalUpdated,
      genreStats,
    });
  } catch (err) {
    console.error("Manganato sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
