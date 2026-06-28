/**
 * Scraper Index
 * 
 * Exports all scrapers and provides unified scraping interface
 */

import type { RawScrapedData, FullSyncResult, SyncResult } from "../types/manga";
import type { ProgressCallback } from "./base-scraper";

// Import scrapers
import { scrapeOmegaScans, omegaScraper } from "./omega-scraper";
import { scrapeAsuraScans, asuraScraper } from "./asura-scraper";
import { scrapeManganato, manganatoScraper } from "./manganato-scraper";
import { scrapeWebtoons, webtoonScraper } from "./webtoon-scraper";

// Export individual scrapers
export {
  scrapeOmegaScans,
  scrapeAsuraScans,
  scrapeManganato,
  scrapeWebtoons,
  omegaScraper,
  asuraScraper,
  manganatoScraper,
  webtoonScraper,
};

// Export base classes and types
export * from "./base-scraper";

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED SCRAPING
// ═══════════════════════════════════════════════════════════════════════════

export interface ScraperInfo {
  name: string;
  scrape: (onProgress?: ProgressCallback) => Promise<RawScrapedData[]>;
  priority: number; // Lower = higher priority
}

/**
 * All available scrapers ordered by priority
 */
export const ALL_SCRAPERS: ScraperInfo[] = [
  { name: "Omega Scans", scrape: scrapeOmegaScans, priority: 1 },
  { name: "Asura Scans", scrape: scrapeAsuraScans, priority: 2 },
  { name: "Manganato", scrape: scrapeManganato, priority: 3 },
  { name: "Webtoons", scrape: scrapeWebtoons, priority: 4 },
];

/**
 * Scrape from all sources
 */
export async function scrapeAllSources(
  onProgress?: (source: string, progress: number, total: number) => void
): Promise<Map<string, RawScrapedData[]>> {
  const results = new Map<string, RawScrapedData[]>();
  const total = ALL_SCRAPERS.length;

  for (let i = 0; i < ALL_SCRAPERS.length; i++) {
    const scraper = ALL_SCRAPERS[i];
    
    onProgress?.(scraper.name, i, total);

    try {
      console.log(`[Scraper] Starting ${scraper.name}...`);
      const startTime = Date.now();
      
      const data = await scraper.scrape((progress) => {
        console.log(`[${scraper.name}] ${progress.message}`);
      });
      
      const duration = Date.now() - startTime;
      console.log(`[Scraper] ${scraper.name} completed: ${data.length} titles in ${duration}ms`);
      
      results.set(scraper.name, data);
    } catch (err) {
      console.error(`[Scraper] ${scraper.name} failed:`, err);
      results.set(scraper.name, []);
    }
  }

  onProgress?.("Complete", total, total);
  return results;
}

/**
 * Scrape from a specific source by name
 */
export async function scrapeSource(
  sourceName: string,
  onProgress?: ProgressCallback
): Promise<RawScrapedData[]> {
  const scraper = ALL_SCRAPERS.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
  
  if (!scraper) {
    console.error(`Unknown source: ${sourceName}`);
    return [];
  }

  return scraper.scrape(onProgress);
}

/**
 * Get list of available source names
 */
export function getAvailableSources(): string[] {
  return ALL_SCRAPERS.map(s => s.name);
}
