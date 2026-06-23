import type { MangaResult } from "./scraper";

// ─────────────────────────────────────────────────────────────────────────────
// Request coalescing — prevents thundering herd problem
// If 50 users search "Solo Leveling" within 5 seconds, only ONE scrape runs
// ─────────────────────────────────────────────────────────────────────────────

const inflight = new Map<string, Promise<MangaResult[]>>();

/**
 * Coalesce identical concurrent requests into a single operation.
 * Subsequent requests for the same query wait on the first one's promise.
 */
export function coalesceRequest<T>(
  key: string,
  operation: () => Promise<T>,
  map: Map<string, Promise<T>> = new Map()
): Promise<T> {
  const normalizedKey = key.toLowerCase().trim();

  // Check if there's already an in-flight request for this key
  const existing = map.get(normalizedKey);
  if (existing) {
    return existing;
  }

  // Create new promise and store it
  const promise = operation().finally(() => {
    map.delete(normalizedKey);
  });

  map.set(normalizedKey, promise);
  return promise;
}

/**
 * Coalesce search requests specifically
 */
export function coalesceSearch(
  query: string,
  scraper: () => Promise<MangaResult[]>
): Promise<MangaResult[]> {
  return coalesceRequest(query, scraper, inflight);
}

/**
 * Get count of currently in-flight requests
 */
export function getInflightCount(): number {
  return inflight.size;
}
