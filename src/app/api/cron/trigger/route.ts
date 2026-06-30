import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { guardCronApi } from "@/lib/cronAuth";

export async function GET(req: NextRequest) {
  // Validate cron secret if deployed
  const guard = guardCronApi(req);
  if (guard && process.env.NODE_ENV === "production") return guard;

  if (!process.env.QSTASH_TOKEN) {
    console.warn("QSTASH_TOKEN not found. Make sure to add it to your environment variables.");
    return NextResponse.json({ error: "QSTASH_TOKEN missing" }, { status: 500 });
  }

  const qstash = new Client({ token: process.env.QSTASH_TOKEN });
  
  // Base URL for the worker. Use production URL or fallback to host header
  const host = req.headers.get("host") || "www.mangavault.in";
  const protocol = host.includes("localhost") ? "http" : "https";
  const workerUrl = `${protocol}://${host}/api/sync/worker`;

  const sources = [
    "asura", "manganato", "demonic", "scythe", "omega", "webtoons"
  ];

  let queued = 0;

  for (const source of sources) {
    try {
      await qstash.publishJSON({
        url: workerUrl,
        body: { source, page: 1 },
      });
      queued++;
    } catch (e) {
      console.error(`Failed to queue trigger for ${source}`, e);
    }
  }
  
  return NextResponse.json({ 
    success: true, 
    message: `Started master sync process. Queued ${queued} sources for Page 1.` 
  });
}
