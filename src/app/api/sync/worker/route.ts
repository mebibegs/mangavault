import { NextResponse } from "next/server";
import { Client, Receiver } from "@upstash/qstash";
import { browseSource } from "@/lib/scrapers/registry";
import { upsertResults } from "@/lib/sync";

interface SyncWorkerBody {
  source?: string;
  page?: number;
}

async function readVerifiedBody(req: Request): Promise<{ body?: SyncWorkerBody; response?: NextResponse }> {
  const rawBody = await req.text();
  const signature = req.headers.get("upstash-signature");

  if (!signature) {
    if (process.env.NODE_ENV !== "production") {
      return { body: parseBody(rawBody) };
    }
    return { response: NextResponse.json({ error: "Missing QStash signature" }, { status: 401 }) };
  }

  try {
    const receiver = new Receiver();
    const isValid = await receiver.verify({
      signature,
      body: rawBody,
      upstashRegion: req.headers.get("upstash-region") ?? undefined,
    });

    if (!isValid) {
      return { response: NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 }) };
    }
  } catch (error) {
    console.error("[Worker] QStash signature verification failed", error);
    return { response: NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 }) };
  }

  return { body: parseBody(rawBody) };
}

function parseBody(rawBody: string): SyncWorkerBody {
  if (!rawBody) return {};
  return JSON.parse(rawBody) as SyncWorkerBody;
}

export async function POST(req: Request) {
  try {
    const { body, response } = await readVerifiedBody(req);
    if (response) return response;

    const source = body?.source;
    const page = Number.isFinite(body?.page) && Number(body?.page) > 0 ? Number(body?.page) : 1;

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

    const MAX_PAGES = parseInt(process.env.MAX_SYNC_PAGES || "3600", 10);
    const shouldQueueNext = hasMore && results.length > 0 && page < MAX_PAGES;
    let queuedNext = false;

    if (shouldQueueNext && process.env.QSTASH_TOKEN) {
      const qstash = new Client({ token: process.env.QSTASH_TOKEN });
      const host = req.headers.get("host") || "www.mangavault.in";
      const protocol = host.includes("localhost") ? "http" : "https";
      const workerUrl = `${protocol}://${host}/api/sync/worker`;

      await qstash.publishJSON({
        url: workerUrl,
        body: { source, page: page + 1 },
        delay: "2s",
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
      queuedNext,
      canQueueNext: shouldQueueNext,
    });
  } catch (error) {
    console.error("[Worker Error]", error);
    return NextResponse.json({ error: "Worker failed", details: String(error) }, { status: 500 });
  }
}
