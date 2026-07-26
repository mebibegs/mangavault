import { LRUCache } from "lru-cache";
import type { MangaResult } from "./scraper";
import { getRedis } from "./redisEnv";

const SEARCH_TTL_SECONDS = 60 * 15;
const TRENDING_TTL_SECONDS = 60 * 15;

const memoryCache = new LRUCache<string, MangaResult[] | { results: MangaResult[]; hasMore: boolean }>({
  max: 500,
  ttl: SEARCH_TTL_SECONDS * 1000,
});

const redis = getRedis();

function searchKey(query: string): string {
  return `mangavault:cache:search:${query.toLowerCase().trim()}`;
}

function trendingKey(page: number, sort?: string): string {
  return `mangavault:cache:trending:${sort || "latest"}:${page}`;
}

export async function getCachedSearch(query: string): Promise<MangaResult[] | null> {
  const normalizedQuery = query.toLowerCase().trim();
  const key = searchKey(normalizedQuery);

  if (redis) {
    const cached = await redis.get<MangaResult[]>(key).catch(() => null);
    if (cached) return cached;
  }

  return (memoryCache.get(key) as MangaResult[] | undefined) || null;
}

export async function setCachedSearch(query: string, results: MangaResult[]): Promise<void> {
  const normalizedQuery = query.toLowerCase().trim();
  const key = searchKey(normalizedQuery);
  memoryCache.set(key, results);
  if (redis) await redis.set(key, results, { ex: SEARCH_TTL_SECONDS }).catch(() => undefined);
}

export async function trackQueryFrequency(query: string): Promise<void> {
  if (!redis) return;
  const key = `mangavault:query-frequency:${query.toLowerCase().trim()}`;
  await redis.incr(key).catch(() => undefined);
  await redis.expire(key, 60 * 60 * 24 * 30).catch(() => undefined);
}

export async function getCachedTrending(page: number, sort?: string): Promise<{ results: MangaResult[]; hasMore: boolean; total?: number } | null> {
  const key = trendingKey(page, sort);

  if (redis) {
    const cached = await redis.get<{ results: MangaResult[]; hasMore: boolean; total?: number }>(key).catch(() => null);
    if (cached) return cached;
  }

  return (memoryCache.get(key) as { results: MangaResult[]; hasMore: boolean; total?: number } | undefined) || null;
}

export async function setCachedTrending(page: number, results: { results: MangaResult[]; hasMore: boolean; total?: number }, sort?: string): Promise<void> {
  const key = trendingKey(page, sort);
  memoryCache.set(key, results, { ttl: TRENDING_TTL_SECONDS * 1000 });
  if (redis) await redis.set(key, results, { ex: TRENDING_TTL_SECONDS }).catch(() => undefined);
}

export async function getTopQueries(_limit = 10): Promise<{ query: string; count: number }[]> {
  return [];
}

export async function cleanupExpiredCache(): Promise<number> {
  return 0;
}
