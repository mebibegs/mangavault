import { NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { browseSource } from "@/lib/scrapers/registry";
import { upsertResults } from "@/lib/sync";
import { readQStashVerifiedBody, resolveBaseUrl } from "@/lib/qstash";

interface SyncWorkerBody {
  source?: string;
  page?: number;
  /** consecutive pages that returned zero results — used to stop dead chains */
  emptyStreak?: number;
}

function parseBody(rawBody: string): SyncWorkerBody {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody) as SyncWorkerBody;
  } catch {
    return {};
  }
}

// Give up on a source after this many consecutive empty/failed pages.
const MAX_EMPTY_STREAK = 5;

export async function POST(req: Request) {
  try {
    const rawBody = await readQStashVerifiedBody(req);
    if (rawBody === null) {
      return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
    }
    const body = parseBody(rawBody);

    const source = body?.source;
    const page = Number.isFinite(body?.page) && Number(body?.page) > 0 ? Number(body?.page) : 1;
    const emptyStreak = Number.isFinite(body?.emptyStreak) && Number(body?.emptyStreak) > 0 ? Number(body?.emptyStreak) : 0;

    if (!source) {
      return NextResponse.json({ error: "Missing source" }, { status: 400 });
    }

    console.log(`[Worker] Scraping ${source} - Page ${page}`);

    const result = await browseSource(source, page);

    if (!result) {
      return NextResponse.json({ error: `Source ${source} not found or failed` }, { status: 404 });
    }

    const { results, hasMore } = result;

    let inserted = 0;
    let updated = 0;
    if (results && results.length > 0) {
      const stats = await upsertResults(results);
      inserted = stats.inserted;
      updated = stats.updated;
    }

    // A transient failure (or a sparse page) shouldn't kill the whole chain:
    // keep going while hasMore, but stop after MAX_EMPTY_STREAK dead pages
    // in a row so a broken source doesn't loop to MAX_PAGES for nothing.
    const nextEmptyStreak = results.length === 0 ? emptyStreak + 1 : 0;
    const MAX_PAGES = parseInt(process.env.MAX_SYNC_PAGES || "3600", 10);
    const shouldQueueNext = hasMore && page < MAX_PAGES && nextEmptyStreak < MAX_EMPTY_STREAK;
    let queuedNext = false;

    if (shouldQueueNext && process.env.QSTASH_TOKEN) {
      const qstash = new Client({ token: process.env.QSTASH_TOKEN });
      const workerUrl = `${resolveBaseUrl(req)}/api/sync/worker`;

      await qstash.publishJSON({
        url: workerUrl,
        body: { source, page: page + 1, emptyStreak: nextEmptyStreak },
        // Back off harder after an empty/failed page — likely rate limiting.
        delay: nextEmptyStreak > 0 ? Math.min(120, 15 * nextEmptyStreak) : 4,
        retries: 3,
      });
      queuedNext = true;
    }

    return NextResponse.json({
      success: true,
      source,
      scrapedPage: page,
      itemsFound: results?.length || 0,
      inserted,
      updated,
      emptyStreak: nextEmptyStreak,
      queuedNext,
      canQueueNext: shouldQueueNext,
    });
  } catch (error) {
    console.error("[Worker Error]", error);
    return NextResponse.json({ error: "Worker failed", details: String(error) }, { status: 500 });
  }
}
