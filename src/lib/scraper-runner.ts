import CircuitBreaker from "opossum";
import type { MangaResult } from "./scraper";

// ─────────────────────────────────────────────────────────────────────────────
// Per-source timeouts and circuit breakers
// Prevents a single slow/hanging source from blocking all results
// ─────────────────────────────────────────────────────────────────────────────

const SCRAPER_TIMEOUT_MS = 5000; // 5s hard limit per source
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: SCRAPER_TIMEOUT_MS,
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // Try again after 30s
  volumeThreshold: 3, // Minimum requests before circuit can trip
};

// Store circuit breakers per source
const breakers = new Map<string, CircuitBreaker>();

type ScraperFunction = (query: string) => Promise<MangaResult[]>;

function getBreaker(sourceName: string, scraper: ScraperFunction): CircuitBreaker {
  if (!breakers.has(sourceName)) {
    const breaker = new CircuitBreaker(scraper, CIRCUIT_BREAKER_OPTIONS);

    // Log circuit state changes
    breaker.on("open", () => {
      console.warn(`[CircuitBreaker] ${sourceName} circuit OPEN — too many failures`);
    });
    breaker.on("halfOpen", () => {
      console.log(`[CircuitBreaker] ${sourceName} circuit HALF-OPEN — testing`);
    });
    breaker.on("close", () => {
      console.log(`[CircuitBreaker] ${sourceName} circuit CLOSED — recovered`);
    });

    breakers.set(sourceName, breaker);
  }
  return breakers.get(sourceName)!;
}

export interface SourceScraper {
  name: string;
  scrape: ScraperFunction;
}

/**
 * Run all scrapers in parallel with:
 * - Per-source timeout (5s)
 * - Circuit breaker (opens after repeated failures)
 * - Graceful degradation (failed sources return empty, don't block others)
 */
export async function runScrapersWithProtection(
  scrapers: SourceScraper[],
  query: string
): Promise<{ results: MangaResult[]; sourceStats: Record<string, { ok: boolean; count: number; ms: number }> }> {
  const sourceStats: Record<string, { ok: boolean; count: number; ms: number }> = {};

  const scrapePromises = scrapers.map(async ({ name, scrape }) => {
    const start = Date.now();
    const breaker = getBreaker(name, scrape);

    try {
      const results = (await breaker.fire(query)) as MangaResult[];
      sourceStats[name] = { ok: true, count: results.length, ms: Date.now() - start };
      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[Scraper] ${name} failed: ${errorMsg}`);
      sourceStats[name] = { ok: false, count: 0, ms: Date.now() - start };
      return []; // Graceful degradation
    }
  });

  const settledResults = await Promise.allSettled(scrapePromises);

  const results = settledResults
    .filter((r): r is PromiseFulfilledResult<MangaResult[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return { results, sourceStats };
}

/**
 * Check if a source's circuit is currently open (blocked)
 */
export function isSourceBlocked(sourceName: string): boolean {
  const breaker = breakers.get(sourceName);
  return breaker?.opened ?? false;
}

/**
 * Get current status of all circuit breakers
 */
export function getCircuitBreakerStatus(): Record<string, { open: boolean; stats: object }> {
  const status: Record<string, { open: boolean; stats: object }> = {};
  for (const [name, breaker] of breakers) {
    status[name] = {
      open: breaker.opened,
      stats: breaker.stats,
    };
  }
  return status;
}
