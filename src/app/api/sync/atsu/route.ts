import { NextRequest, NextResponse } from "next/server";
import { scrapeAtsuTitles } from "@/lib/atsu-scraper";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 120;

/**
 * Atsu.moe sync — split sitemap URLs into batches of 150.
 *
 * GET /api/sync/atsu            → all batches info
 * GET /api/sync/atsu?batch=1    → URLs 0-149
 * GET /api/sync/atsu?batch=2    → URLs 150-299
 * GET /api/sync/atsu?batch=3    → URLs 300-500
 *
 * Each URL requires an individual page fetch, so 150 per batch
 * is ~60-80 seconds with batches of 10 concurrent fetches.
 */

const BATCH_SIZE = 150;
const MAX_TOTAL = 500;
const TOTAL_BATCHES = Math.ceil(MAX_TOTAL / BATCH_SIZE);

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const batchParam = req.nextUrl.searchParams.get("batch");

  if (!batchParam) {
    return NextResponse.json({
      source: "atsu",
      totalBatches: TOTAL_BATCHES,
      maxTotal: MAX_TOTAL,
      batchSize: BATCH_SIZE,
      batches: Array.from({ length: TOTAL_BATCHES }, (_, i) => ({
        batch: i + 1,
        urlRange: `${i * BATCH_SIZE}-${Math.min((i + 1) * BATCH_SIZE - 1, MAX_TOTAL - 1)}`,
      })),
      usage: "GET /api/sync/atsu?batch=1",
    });
  }

  const batch = parseInt(batchParam, 10);
  if (batch < 1 || batch > TOTAL_BATCHES) {
    return NextResponse.json(
      { error: `Invalid batch. Use 1-${TOTAL_BATCHES}` },
      { status: 400 }
    );
  }

  // scrapeAtsuTitles accepts a limit and scrapes from the beginning.
  // To simulate batches, we scrape up to batch*BATCH_SIZE and discard earlier results.
  // However the underlying function fetches from sitemap offset 0 always, so for
  // efficiency we just pass a limit. The upsert is idempotent, so re-processing
  // overlapping titles only triggers "updated" not duplicate inserts.
  const limit = Math.min(batch * BATCH_SIZE, MAX_TOTAL);

  try {
    await ensureIndexes();
    const allResults = await scrapeAtsuTitles(limit);

    // Only upsert the slice for this batch
    const start = (batch - 1) * BATCH_SIZE;
    const batchResults = allResults.slice(start);

    let inserted = 0, updated = 0;
    for (let i = 0; i < batchResults.length; i += 200) {
      const stats = await upsertResults(batchResults.slice(i, i + 200));
      inserted += stats.inserted;
      updated += stats.updated;
    }

    return NextResponse.json({
      success: true,
      source: "atsu",
      batch,
      urlRange: `${start}-${Math.min(limit - 1, MAX_TOTAL - 1)}`,
      scraped: batchResults.length,
      inserted,
      updated,
    });
  } catch (err) {
    console.error("Atsu sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
