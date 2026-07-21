import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { guardCronApi } from "@/lib/cronAuth";
import { readQStashVerifiedBody, resolveBaseUrl } from "@/lib/qstash";
import { hasRegisteredScraper } from "@/lib/scrapers/registry";

/**
 * Master sync trigger — kicks off one full catalog sync by queueing page 1
 * of every registered source; each worker call then queues the next page.
 *
 * Invoked two ways:
 *   - By the QStash schedule (every 4 hours) as a signed POST.
 *   - Manually via GET with `Authorization: Bearer <CRON_SECRET>`.
 */

async function startSync(req: Request): Promise<NextResponse> {
  if (!process.env.QSTASH_TOKEN) {
    console.warn("QSTASH_TOKEN not found. Make sure to add it to your environment variables.");
    return NextResponse.json({ error: "QSTASH_TOKEN missing" }, { status: 500 });
  }

  const qstash = new Client({ token: process.env.QSTASH_TOKEN });
  const workerUrl = `${resolveBaseUrl(req)}/api/sync/worker`;

  const sources = [
    "asura", "manganato", "demonic", "scythe", "omega", "webtoons", "manhuatop"
  ].filter(hasRegisteredScraper);

  let queued = 0;

  for (const source of sources) {
    try {
      await qstash.publishJSON({
        url: workerUrl,
        body: { source, page: 1 },
        retries: 3,
        // Stagger the sources slightly so seven page-1 workers don't all
        // hit the same cold serverless region at the same instant.
        delay: queued * 5,
      });
      queued++;
    } catch (e) {
      console.error(`Failed to queue trigger for ${source}`, e);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Started master sync process. Queued ${queued} sources for Page 1.`,
  });
}

/** Manual trigger with CRON_SECRET. */
export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;
  return startSync(req);
}

/** Scheduled trigger from QStash (signed request). */
export async function POST(req: NextRequest) {
  const body = await readQStashVerifiedBody(req);
  if (body === null) {
    return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
  }
  return startSync(req);
}
