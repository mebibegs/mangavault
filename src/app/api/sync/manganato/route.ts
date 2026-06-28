import { NextRequest, NextResponse } from "next/server";
import { scrapeAllManganatoGenres, scrapeManganatoAll, scrapeManganatoSitemap } from "@/lib/manganato-scraper";
import { upsertResults } from "@/lib/sync";
import { ensureIndexes } from "@/lib/mongodb";
import { guardCronApi } from "@/lib/cronAuth";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const guard = guardCronApi(req);
  if (guard) return guard;

  const mode = req.nextUrl.searchParams.get("mode") || "sitemap";
  const pages = Math.min(50, parseInt(req.nextUrl.searchParams.get("pages") || "10", 10));
  const limit = Math.min(100000, parseInt(req.nextUrl.searchParams.get("limit") || "10000", 10));

  try {
    await ensureIndexes();

    let results;
    if (mode === "sitemap") {
      results = await scrapeManganatoSitemap(limit);
    } else if (mode === "all") {
      results = await scrapeManganatoAll(pages);
    } else {
      results = await scrapeAllManganatoGenres(pages);
    }

    let inserted = 0, updated = 0;
    for (let i = 0; i < results.length; i += 500) {
      const stats = await upsertResults(results.slice(i, i + 500));
      inserted += stats.inserted;
      updated += stats.updated;
    }

    return NextResponse.json({
      success: true,
      source: "manganato",
      mode,
      scraped: results.length,
      inserted,
      updated,
    });
  } catch (err) {
    console.error("Manganato sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
