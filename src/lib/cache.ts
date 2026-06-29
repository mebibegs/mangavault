import { LRUCache } from "lru-cache";
import type { MangaResult } from "./scraper";

const memoryCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 15, // 15 minutes
});

export async function getCachedSearch(query: string): Promise<MangaResult[] | null> {
  const normalizedQuery = query.toLowerCase().trim();
  const cached = memoryCache.get(normalizedQuery);
  return cached || null;
}

export async function setCachedSearch(query: string, results: MangaResult[]): Promise<void> {
  const normalizedQuery = query.toLowerCase().trim();
  memoryCache.set(normalizedQuery, results);
}

export async function trackQueryFrequency(query: string): Promise<void> {
  // Can implement tracking logic in MongoDB later if needed.
  return Promise.resolve();
}

export async function getCachedTrending(page: number): Promise<{results: MangaResult[], hasMore: boolean} | null> {
  const cached = memoryCache.get(`trending_page_${page}`);
  return cached || null;
}

export async function setCachedTrending(page: number, results: {results: MangaResult[], hasMore: boolean}): Promise<void> {
  memoryCache.set(`trending_page_${page}`, results);
}

export async function getTopQueries(limit = 10): Promise<{query: string, count: number}[]> {
  return [];
}

export async function cleanupExpiredCache(): Promise<number> {
  return 0;
}
