/**
 * Sync Manager
 * 
 * Orchestrates the scraping, transformation, and storage of manga data
 */

import type { MangaDocument, RawScrapedData, FullSyncResult, SyncResult } from "./types/manga";
import { transformRawData } from "./data-transformer";
import { 
  getMangaCollection, 
  upsertMangaBatch, 
  ensureMangaIndexes,
  getDbStats,
  clearAllManga,
} from "./manga-db";
import { scrapeAllSources, scrapeSource, ALL_SCRAPERS } from "./scrapers";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncOptions {
  /** Which sources to sync (default: all) */
  sources?: string[];
  /** Whether to clear existing data first */
  clearFirst?: boolean;
  /** Callback for progress updates */
  onProgress?: (status: SyncStatus) => void;
  /** Maximum titles per source (for testing) */
  maxPerSource?: number;
}

export interface SyncStatus {
  phase: "preparing" | "scraping" | "transforming" | "storing" | "complete" | "error";
  source?: string;
  current: number;
  total: number;
  message: string;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class SyncManager {
  private status: SyncStatus = {
    phase: "preparing",
    current: 0,
    total: 0,
    message: "",
    errors: [],
  };

  private options: SyncOptions = {};

  /**
   * Run a full sync of all sources
   */
  async fullSync(options: SyncOptions = {}): Promise<FullSyncResult> {
    this.options = options;
    const startTime = Date.now();
    const sourceResults: SyncResult[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalMerged = 0;
    let totalFailed = 0;

    try {
      // Phase 1: Prepare
      this.updateStatus({
        phase: "preparing",
        current: 0,
        total: 1,
        message: "Ensuring indexes...",
      });

      await ensureMangaIndexes();

      // Clear if requested
      if (options.clearFirst) {
        this.updateStatus({
          phase: "preparing",
          current: 0,
          total: 1,
          message: "Clearing existing data...",
        });
        await clearAllManga();
      }

      // Get sources to sync
      const sourcesToSync = options.sources?.length
        ? ALL_SCRAPERS.filter(s => 
            options.sources!.some(name => 
              s.name.toLowerCase() === name.toLowerCase()
            )
          )
        : ALL_SCRAPERS;

      const totalSources = sourcesToSync.length;

      // Phase 2: Scrape each source
      for (let i = 0; i < sourcesToSync.length; i++) {
        const scraper = sourcesToSync[i];

        this.updateStatus({
          phase: "scraping",
          source: scraper.name,
          current: i,
          total: totalSources,
          message: `Scraping ${scraper.name}...`,
        });

        try {
          // Scrape
          const rawData = await scraper.scrape((progress) => {
            this.updateStatus({
              phase: "scraping",
              source: scraper.name,
              current: progress.current,
              total: progress.total,
              message: progress.message,
            });
          });

          // Apply max limit if set
          const limitedData = options.maxPerSource
            ? rawData.slice(0, options.maxPerSource)
            : rawData;

          this.updateStatus({
            phase: "transforming",
            source: scraper.name,
            current: 0,
            total: limitedData.length,
            message: `Transforming ${limitedData.length} titles from ${scraper.name}...`,
          });

          // Transform
          const documents: MangaDocument[] = [];
          for (let j = 0; j < limitedData.length; j++) {
            const doc = transformRawData(limitedData[j]);
            if (doc) {
              documents.push(doc);
            }

            if (j % 100 === 0) {
              this.updateStatus({
                phase: "transforming",
                source: scraper.name,
                current: j,
                total: limitedData.length,
                message: `Transformed ${j}/${limitedData.length} from ${scraper.name}`,
              });
            }
          }

          this.updateStatus({
            phase: "storing",
            source: scraper.name,
            current: 0,
            total: documents.length,
            message: `Storing ${documents.length} titles from ${scraper.name}...`,
          });

          // Store in batches
          const batchSize = 50;
          let sourceInserted = 0;
          let sourceUpdated = 0;
          let sourceMerged = 0;
          let sourceFailed = 0;
          const sourceErrors: string[] = [];

          for (let k = 0; k < documents.length; k += batchSize) {
            const batch = documents.slice(k, k + batchSize);
            const result = await upsertMangaBatch(batch, scraper.name);

            sourceInserted += result.inserted;
            sourceUpdated += result.updated;
            sourceMerged += result.merged;
            sourceFailed += result.failed;
            sourceErrors.push(...result.errors);

            this.updateStatus({
              phase: "storing",
              source: scraper.name,
              current: k + batch.length,
              total: documents.length,
              message: `Stored ${k + batch.length}/${documents.length} from ${scraper.name}`,
            });
          }

          const sourceResult: SyncResult = {
            source: scraper.name,
            inserted: sourceInserted,
            updated: sourceUpdated,
            merged: sourceMerged,
            failed: sourceFailed,
            skipped: limitedData.length - documents.length,
            duration: 0, // Will be calculated per source if needed
            errors: sourceErrors.slice(0, 10), // Limit error messages
          };

          sourceResults.push(sourceResult);
          totalInserted += sourceInserted;
          totalUpdated += sourceUpdated;
          totalMerged += sourceMerged;
          totalFailed += sourceFailed;

          console.log(`[Sync] ${scraper.name}: inserted=${sourceInserted}, updated=${sourceUpdated}, merged=${sourceMerged}, failed=${sourceFailed}`);

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[Sync] ${scraper.name} failed:`, err);
          
          sourceResults.push({
            source: scraper.name,
            inserted: 0,
            updated: 0,
            merged: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            errors: [errorMessage],
          });

          this.status.errors.push(`${scraper.name}: ${errorMessage}`);
        }
      }

      // Get final stats
      const stats = await getDbStats();

      this.updateStatus({
        phase: "complete",
        current: totalSources,
        total: totalSources,
        message: `Sync complete: ${stats.total} total documents`,
      });

      return {
        success: true,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        totalDuration: Date.now() - startTime,
        totalInserted,
        totalUpdated,
        totalMerged,
        totalFailed,
        totalDocuments: stats.total,
        sourceResults,
        errors: this.status.errors,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      this.updateStatus({
        phase: "error",
        current: 0,
        total: 0,
        message: `Sync failed: ${errorMessage}`,
      });

      return {
        success: false,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        totalDuration: Date.now() - startTime,
        totalInserted,
        totalUpdated,
        totalMerged,
        totalFailed,
        totalDocuments: 0,
        sourceResults,
        errors: [errorMessage, ...this.status.errors],
      };
    }
  }

  /**
   * Sync a single source
   */
  async syncSource(sourceName: string, options: Omit<SyncOptions, "sources"> = {}): Promise<SyncResult> {
    const result = await this.fullSync({
      ...options,
      sources: [sourceName],
    });

    return result.sourceResults[0] || {
      source: sourceName,
      inserted: 0,
      updated: 0,
      merged: 0,
      failed: 0,
      skipped: 0,
      duration: result.totalDuration,
      errors: result.errors,
    };
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(update: Partial<SyncStatus>): void {
    this.status = {
      ...this.status,
      ...update,
      errors: update.errors || this.status.errors,
    };
    this.options.onProgress?.(this.status);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run a full sync of all sources
 */
export async function runFullSync(options?: SyncOptions): Promise<FullSyncResult> {
  const manager = new SyncManager();
  return manager.fullSync(options);
}

/**
 * Sync a single source
 */
export async function runSourceSync(sourceName: string, options?: Omit<SyncOptions, "sources">): Promise<SyncResult> {
  const manager = new SyncManager();
  return manager.syncSource(sourceName, options);
}

/**
 * Quick sync - just first 100 titles from each source (for testing)
 */
export async function runQuickSync(): Promise<FullSyncResult> {
  return runFullSync({ maxPerSource: 100 });
}

/**
 * Fresh sync - clear everything and start fresh
 */
export async function runFreshSync(): Promise<FullSyncResult> {
  return runFullSync({ clearFirst: true });
}
