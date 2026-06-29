import { NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { browseSource } from "@/lib/scrapers/registry";
import { upsertResults } from "@/lib/sync";

export const maxDuration = 60; // 60 seconds is plenty for 1 page

export async function POST(req: Request) {
  // In production, QStash automatically verifies signatures if you use the @upstash/qstash verify util.
  // For simplicity and immediate integration, we'll process the body.
  
  try {
    const body = await req.json();
    const { source, page = 1 } = body;

    if (!source) {
      return NextResponse.json({ error: "Missing source" }, { status: 400 });
    }

    console.log(`[Worker] Scraping ${source} - Page ${page}`);

    // 1. Scrape just this ONE page (Takes ~2-5 seconds)
    const result = await browseSource(source, page);
    
    if (!result) {
      return NextResponse.json({ error: `Source ${source} not found or failed` }, { status: 404 });
    }

    const { results, hasMore } = result;

    // 2. Save to database
    let inserted = 0, updated = 0;
    if (results && results.length > 0) {
      const stats = await upsertResults(results);
      inserted = stats.inserted;
      updated = stats.updated;
    }

    // 3. The Magic Step: If there is a next page, queue it!
    if (hasMore && results.length > 0 && process.env.QSTASH_TOKEN) {
      // Prevent infinite loops by putting a hard cap per source (e.g. 100 pages)
      const MAX_PAGES = 100;
      
      if (page < MAX_PAGES) {
        const qstash = new Client({ token: process.env.QSTASH_TOKEN });
        const host = req.headers.get("host") || "www.mangavault.in";
        const protocol = host.includes("localhost") ? "http" : "https";
        const workerUrl = `${protocol}://${host}/api/sync/worker`;

        await qstash.publishJSON({
          url: workerUrl,
          body: { source, page: page + 1 },
          delay: "3s" // Be respectful to the target site
        });
      }
    }

    // Return immediately so Vercel/Cloudflare never timeout
    return NextResponse.json({ 
      success: true, 
      source, 
      scrapedPage: page,
      itemsFound: results?.length || 0,
      inserted,
      updated,
      queuedNext: hasMore && results.length > 0 && page < 100
    });
    
  } catch (error) {
    console.error("[Worker Error]", error);
    return NextResponse.json({ error: "Worker failed", details: String(error) }, { status: 500 });
  }
}
