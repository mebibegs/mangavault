import { config } from "dotenv";
config({ path: ".env.local" });

// Fix DNS SRV resolution for MongoDB Atlas
import { setDefaultResultOrder } from "dns";
try { setDefaultResultOrder("ipv4first"); } catch {}

async function run() {
  const { ensureIndexes, getMongoDb } = await import("../src/lib/mongodb");
  const { listRegisteredScrapers, browseSource } = await import("../src/lib/scrapers/registry");
  const { upsertResults } = await import("../src/lib/sync");

  const MAX_PAGES: Record<string, number> = {
    asura: 20,
    demonic: 10,
    scythe: 10,
    webtoons: 1,
    manganato: 100,
    omega: 100,
    manhuatop: 50,
  };

  const CONCURRENCY = 2;

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function scrapeSource(source: string, maxPages: number) {
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalItems = 0;

    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`  [${source}] page ${page}/${maxPages}...`);
        const result = await browseSource(source, page);
        if (!result) {
          console.log(`  [${source}] no scraper returned, stopping.`);
          break;
        }

        const { results, hasMore } = result;
        totalItems += results.length;

        if (results.length > 0) {
          const stats = await upsertResults(results);
          totalInserted += stats.inserted;
          totalUpdated += stats.updated;
          console.log(`  [${source}] page ${page}: ${results.length} items, +${stats.inserted} new, ~${stats.updated} updated`);
        } else {
          console.log(`  [${source}] page ${page}: 0 items`);
        }

        if (!hasMore) {
          console.log(`  [${source}] no more pages after page ${page}`);
          break;
        }

        await sleep(1500);
      } catch (err) {
        console.error(`  [${source}] page ${page} error:`, err instanceof Error ? err.message : err);
        await sleep(3000);
      }
    }

    return { totalInserted, totalUpdated, totalItems };
  }

  const startTime = Date.now();
  console.log("=== MangaVault Full Sync ===");
  console.log("Connecting to MongoDB...");

  const db = await getMongoDb();
  if (!db) {
    console.error("Failed to connect to MongoDB. Check MONGODB_URI in .env.local");
    process.exit(1);
  }

  await ensureIndexes();
  console.log("MongoDB indexes ensured.\n");

  const sources = listRegisteredScrapers();
  console.log(`Found ${sources.length} registered sources: ${sources.join(", ")}\n`);

  const allStats: Record<string, { inserted: number; updated: number; items: number }> = {};

  for (let i = 0; i < sources.length; i += CONCURRENCY) {
    const batch = sources.slice(i, i + CONCURRENCY);
    console.log(`\n--- Scraping batch [${batch.join(", ")}] ---`);

    const batchResults = await Promise.all(
      batch.map(async (source) => {
        const maxPages = MAX_PAGES[source] || 10;
        console.log(`Starting ${source} (max ${maxPages} pages)...`);
        const stats = await scrapeSource(source, maxPages);
        console.log(`Finished ${source}: ${stats.totalItems} items scraped, ${stats.totalInserted} inserted, ${stats.totalUpdated} updated`);
        return { source, ...stats };
      })
    );

    for (const r of batchResults) {
      allStats[r.source] = { inserted: r.totalInserted, updated: r.totalUpdated, items: r.totalItems };
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n\n=== SYNC COMPLETE ===");
  console.log(`Time: ${elapsed}s`);
  console.log("\nSource breakdown:");

  let grandTotal = { inserted: 0, updated: 0, items: 0 };
  for (const [source, stats] of Object.entries(allStats)) {
    console.log(`  ${source}: ${stats.items} scraped, ${stats.inserted} new, ${stats.updated} updated`);
    grandTotal.inserted += stats.inserted;
    grandTotal.updated += stats.updated;
    grandTotal.items += stats.items;
  }

  console.log(`\nGrand total: ${grandTotal.items} scraped, ${grandTotal.inserted} new titles, ${grandTotal.updated} updated titles`);

  const col = db.collection("titles");
  const totalInDb = await col.countDocuments();
  console.log(`Total titles in database: ${totalInDb}`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
