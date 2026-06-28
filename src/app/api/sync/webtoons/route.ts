import { NextRequest, NextResponse } from "next/server";
import { scrapeWebtoonGenre, WEBTOON_GENRE_SLUGS } from "@/lib/webtoon-genres";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 120;

/**
 * Webtoons sync — split 17 genres into batches of 6.
 *
 * GET /api/sync/webtoons            → all batches info
 * GET /api/sync/webtoons?batch=1    → genres 0-5   (action,comedy,drama,fantasy,horror,mystery)
 * GET /api/sync/webtoons?batch=2    → genres 6-11  (romance,sf,thriller,supernatural,sports,slice-of-life)
 * GET /api/sync/webtoons?batch=3    → genres 12-16 (historical,heartwarming,super-hero,graphic-novel,tiptoon)
 */

const BATCH_SIZE = 6;
const TOTAL_BATCHES = Math.ceil(WEBTOON_GENRE_SLUGS.length / BATCH_SIZE);

function getBatchGenres(batch: number): string[] {
  const start = (batch - 1) * BATCH_SIZE;
  return WEBTOON_GENRE_SLUGS.slice(start, start + BATCH_SIZE);
}

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const batchParam = req.nextUrl.searchParams.get("batch");

  if (!batchParam) {
    return NextResponse.json({
      source: "webtoons",
      totalBatches: TOTAL_BATCHES,
      totalGenres: WEBTOON_GENRE_SLUGS.length,
      batches: Array.from({ length: TOTAL_BATCHES }, (_, i) => ({
        batch: i + 1,
        genres: getBatchGenres(i + 1),
      })),
      usage: "GET /api/sync/webtoons?batch=1",
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
        const results = await scrapeWebtoonGenre(slug);
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
      source: "webtoons",
      batch,
      genres,
      scraped: totalScraped,
      inserted: totalInserted,
      updated: totalUpdated,
      genreStats,
    });
  } catch (err) {
    console.error("Webtoon sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
