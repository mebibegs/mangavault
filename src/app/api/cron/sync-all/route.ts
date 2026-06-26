import { NextRequest, NextResponse } from "next/server";
import { ensureIndexes } from "@/lib/mongodb";
import { upsertResults } from "@/lib/sync";
import { scrapeAllOmegaTitles } from "@/lib/omega-scraper";
import { scrapeAllWebtoonGenres } from "@/lib/webtoon-genres";
import { scrapeAllAsuraGenres } from "@/lib/asura-genres";
import { scrapeAllDemonicTitles } from "@/lib/demonic-genres";
import { scrapeAllScytheGenres } from "@/lib/scythe-genres";
import { scrapeAllManganatoGenres } from "@/lib/manganato-scraper";
import { scrapeAtsuTitles } from "@/lib/atsu-scraper";

export const maxDuration = 300;

/**
 * Nightly full-catalog sync.
 *
 * Scrapes new titles from ALL sources and upserts into MongoDB.
 * Runs via Vercel Cron at 2:00 AM UTC daily.
 *
 * Sources covered:
 *  - Omega Scans   (adult + SFW)
 *  - Webtoons      (all genre pages)
 *  - Asura Scans   (all genre pages)
 *  - Demonic Scans (paginated listing)
 *  - Scythe Scans  (genre pages)
 *  - Manganato     (genre pages, 5 pages each)
 *  - Atsu.moe      (sitemap, 300 titles)
 *
 * Each source runs sequentially to avoid hammering upstream servers.
 * New titles are inserted; existing titles get metadata + genre updates.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  await ensureIndexes();

  const stats: Record<string, { inserted: number; updated: number; scraped: number; error?: string }> = {};

  // Helper: scrape a source, upsert in batches, record stats
  async function syncSource(
    name: string,
    fetchFn: () => Promise<import("@/lib/scraper").MangaResult[]>
  ) {
    try {
      const results = await fetchFn();
      let inserted = 0;
      let updated = 0;
      for (let i = 0; i < results.length; i += 200) {
        const s = await upsertResults(results.slice(i, i + 200));
        inserted += s.inserted;
        updated += s.updated;
      }
      stats[name] = { scraped: results.length, inserted, updated };
    } catch (err) {
      stats[name] = {
        scraped: 0,
        inserted: 0,
        updated: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  // Run all sources sequentially (avoids overwhelming upstream + our DB)
  await syncSource("omega",     () => scrapeAllOmegaTitles());
  await syncSource("webtoons",  () => scrapeAllWebtoonGenres());
  await syncSource("asura",     () => scrapeAllAsuraGenres());
  await syncSource("demonic",   () => scrapeAllDemonicTitles());
  await syncSource("scythe",    () => scrapeAllScytheGenres());
  await syncSource("manganato", () => scrapeAllManganatoGenres(5));
  await syncSource("atsu",      () => scrapeAtsuTitles(300));

  const totalInserted = Object.values(stats).reduce((s, v) => s + v.inserted, 0);
  const totalUpdated  = Object.values(stats).reduce((s, v) => s + v.updated, 0);
  const totalScraped  = Object.values(stats).reduce((s, v) => s + v.scraped, 0);

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - startTime,
    totalScraped,
    totalInserted,
    totalUpdated,
    sources: stats,
  });
}
