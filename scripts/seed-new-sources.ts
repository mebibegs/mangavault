import dotenv from "dotenv";
import path from "path";
// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { browseSource } from "../src/lib/scrapers/registry";
import { upsertResults } from "../src/lib/sync";
import { getMongoDb } from "../src/lib/mongodb";

const sources = [
  "flamecomics",
  "vortexscans",
  "toongod",
  "webtoonscan",
  "mangago",
  "mangavaultxyz",
  "mangafire"
];

async function run() {
  const db = await getMongoDb();
  if (!db) {
    console.error("Failed to connect to MongoDB. Check MONGODB_URI.");
    process.exit(1);
  }
  console.log("Connected to MongoDB successfully.");

  // For initial seeding, we'll cap it at 15 pages per source to get the 
  // most popular / latest ~300 manga per source immediately.
  const MAX_PAGES = 15;

  for (const source of sources) {
    console.log(`\n==============================================`);
    console.log(` Starting Initial Scrape for: ${source.toUpperCase()}`);
    console.log(`==============================================`);
    
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= MAX_PAGES) {
      console.log(`[${source}] Fetching page ${page}...`);
      
      try {
        const result = await browseSource(source, page);
        
        if (!result || !result.results || result.results.length === 0) {
          console.log(`[${source}] No results on page ${page}. Moving to next source.`);
          break;
        }
        
        const stats = await upsertResults(result.results);
        console.log(`[${source}] Page ${page} -> Inserted: ${stats.inserted}, Updated: ${stats.updated} (Total found: ${result.results.length})`);
        
        hasMore = result.hasMore;
        page++;
        
        // Wait 2 seconds between pages to respect target sites
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`[${source}] Error on page ${page}:`, e);
        break;
      }
    }
    
    console.log(`[${source}] Finished seeding.`);
  }

  console.log("\n✅ ALL SOURCES SEEDED SUCCESSFULLY!");
  process.exit(0);
}

run();
