import { NextRequest, NextResponse } from "next/server";
import { scrapeScytheGenre, SCYTHE_GENRE_SLUGS } from "@/lib/scythe-genres";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 120;

/**
 * Scythe Scans sync — split 18 genres into batches of 6.
 *
 * GET /api/sync/scythe            → all batches info
 * GET /api/sync/scythe?batch=1    → genres 0-5
 * GET /api/sync/scythe?batch=2    → genres 6-11
 * GET /api/sync/scythe?batch=3    → genres 12-17
 */

const BATCH_SIZE = 6;
const TOTAL_BATCHES = Math.ceil(SCYTHE_GENRE_SLUGS.length / BATCH_SIZE);

function getBatchGenres(batch: number): string[] {
  const start = (batch - 1) * BATCH_SIZE;
  return SCYTHE_GENRE_SLUGS.slice(start, start + BATCH_SIZE);
}

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const batchParam = req.nextUrl.searchParams.get("batch");

  if (!batchParam) {
    return NextResponse.json({
      source: "scythe",
      totalBatches: TOTAL_BATCHES,
      totalGenres: SCYTHE_GENRE_SLUGS.length,
      batches: Array.from({ length: TOTAL_BATCHES }, (_, i) => ({
        batch: i + 1,
        genres: getBatchGenres(i + 1),
      })),
      usage: "GET /api/sync/scythe?batch=1",
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
        const results = await scrapeScytheGenre(slug);
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
      source: "scythe",
      batch,
      genres,
      scraped: totalScraped,
      inserted: totalInserted,
      updated: totalUpdated,
      genreStats,
    });
  } catch (err) {
    console.error("Scythe sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
