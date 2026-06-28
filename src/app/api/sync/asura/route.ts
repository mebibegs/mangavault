import { NextRequest, NextResponse } from "next/server";
import { scrapeAsuraGenre, ASURA_GENRE_SLUGS } from "@/lib/asura-genres";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 120;

/**
 * Asura Scans sync — split 31 genres into batches of 8.
 *
 * GET /api/sync/asura            → all batches info
 * GET /api/sync/asura?batch=1    → genres 0-7
 * GET /api/sync/asura?batch=2    → genres 8-15
 * GET /api/sync/asura?batch=3    → genres 16-23
 * GET /api/sync/asura?batch=4    → genres 24-30
 */

const BATCH_SIZE = 8;
const TOTAL_BATCHES = Math.ceil(ASURA_GENRE_SLUGS.length / BATCH_SIZE);

function getBatchGenres(batch: number): string[] {
  const start = (batch - 1) * BATCH_SIZE;
  return ASURA_GENRE_SLUGS.slice(start, start + BATCH_SIZE);
}

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const batchParam = req.nextUrl.searchParams.get("batch");

  if (!batchParam) {
    return NextResponse.json({
      source: "asura",
      totalBatches: TOTAL_BATCHES,
      totalGenres: ASURA_GENRE_SLUGS.length,
      batches: Array.from({ length: TOTAL_BATCHES }, (_, i) => ({
        batch: i + 1,
        genres: getBatchGenres(i + 1),
      })),
      usage: "GET /api/sync/asura?batch=1",
    });
  }

  const batch = parseInt(batchParam, 10);
  if (batch < 1 || batch > TOTAL_BATCHES) {
    return NextResponse.json(
      { error: `Invalid batch. Use 1-${TOTAL_BATCHES}` },
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

    for (const slug of genres) {
      try {
        const results = await scrapeAsuraGenre(slug);
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
      source: "asura",
      batch,
      genres,
      scraped: totalScraped,
      inserted: totalInserted,
      updated: totalUpdated,
      genreStats,
    });
  } catch (err) {
    console.error("Asura sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
