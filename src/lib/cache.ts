import { LRUCache } from "lru-cache";
import { db } from "@/db";
import { cache, queryStats } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import type { MangaResult } from "./scraper";

// ─────────────────────────────────────────────────────────────────────────────
// Multi-tier caching: L1 (in-memory LRU) → L2 (PostgreSQL) → L3 (live scrape)
// Uses your existing PostgreSQL database — no Redis needed!
// ─────────────────────────────────────────────────────────────────────────────

// L1: In-memory LRU cache (survives within single Vercel function invocation)
const memCache = new LRUCache<string, MangaResult[]>({
  max: 500, // max 500 unique queries
  ttl: 1000 * 60 * 5, // 5 minute TTL
});

// L1 for trending (longer TTL)
const trendingCache = new LRUCache<string, { results: MangaResult[]; hasMore: boolean }>({
  max: 50,
  ttl: 1000 * 60 * 15, // 15 minute TTL
});

// ─────────────────────────────────────────────────────────────────────────────
// Search cache
// ─────────────────────────────────────────────────────────────────────────────

export async function getCachedSearch(query: string): Promise<MangaResult[] | null> {
  const key = `search:${query.toLowerCase().trim()}`;

  // L1: In-memory (instant)
  const memHit = memCache.get(key);
  if (memHit) {
    return memHit;
  }

  // L2: PostgreSQL
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(cache)
      .where(eq(cache.key, key))
      .limit(1);

    if (rows.length > 0 && rows[0].expiresAt > now) {
      const parsed = rows[0].value as MangaResult[];
      memCache.set(key, parsed); // Populate L1
      return parsed;
    }
  } catch (err) {
    console.error("[Cache] PostgreSQL read error:", err);
  }

  return null; // Cache miss
}

export async function setCachedSearch(query: string, results: MangaResult[]): Promise<void> {
  const key = `search:${query.toLowerCase().trim()}`;

  // Always set L1
  memCache.set(key, results);

  // Set L2 (PostgreSQL)
  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL
    await db
      .insert(cache)
      .values({ key, value: results, expiresAt })
      .onConflictDoUpdate({
        target: cache.key,
        set: { value: results, expiresAt, createdAt: new Date() },
      });
  } catch (err) {
    console.error("[Cache] PostgreSQL write error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trending cache
// ─────────────────────────────────────────────────────────────────────────────

export async function getCachedTrending(
  page: number
): Promise<{ results: MangaResult[]; hasMore: boolean } | null> {
  const key = `trending:${page}`;

  // L1
  const memHit = trendingCache.get(key);
  if (memHit) return memHit;

  // L2: PostgreSQL
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(cache)
      .where(eq(cache.key, key))
      .limit(1);

    if (rows.length > 0 && rows[0].expiresAt > now) {
      const parsed = rows[0].value as { results: MangaResult[]; hasMore: boolean };
      trendingCache.set(key, parsed);
      return parsed;
    }
  } catch (err) {
    console.error("[Cache] PostgreSQL read error:", err);
  }

  return null;
}

export async function setCachedTrending(
  page: number,
  data: { results: MangaResult[]; hasMore: boolean }
): Promise<void> {
  const key = `trending:${page}`;

  // L1
  trendingCache.set(key, data);

  // L2: PostgreSQL
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL
    await db
      .insert(cache)
      .values({ key, value: data, expiresAt })
      .onConflictDoUpdate({
        target: cache.key,
        set: { value: data, expiresAt, createdAt: new Date() },
      });
  } catch (err) {
    console.error("[Cache] PostgreSQL write error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Query analytics (for cache pre-warming)
// ─────────────────────────────────────────────────────────────────────────────

export async function trackQueryFrequency(query: string): Promise<void> {
  const normalizedQuery = query.toLowerCase().trim();

  try {
    await db
      .insert(queryStats)
      .values({ query: normalizedQuery, count: "1", lastSearched: new Date() })
      .onConflictDoUpdate({
        target: queryStats.query,
        set: {
          count: sql`(${queryStats.count}::integer + 1)::text`,
          lastSearched: new Date(),
        },
      });
  } catch (err) {
    // Non-critical — don't block on tracking errors
    console.error("[QueryStats] Track error:", err);
  }
}

export async function getTopQueries(count: number = 50): Promise<string[]> {
  try {
    const rows = await db
      .select({ query: queryStats.query })
      .from(queryStats)
      .orderBy(desc(sql`${queryStats.count}::integer`))
      .limit(count);

    return rows.map((r) => r.query);
  } catch (err) {
    console.error("[QueryStats] Get top queries error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache cleanup (removes expired entries)
// Call this periodically from a cron job
// ─────────────────────────────────────────────────────────────────────────────

export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = new Date();
    const result = await db.delete(cache).where(sql`${cache.expiresAt} < ${now}`);
    return result.rowCount ?? 0;
  } catch (err) {
    console.error("[Cache] Cleanup error:", err);
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache invalidation helpers
// ─────────────────────────────────────────────────────────────────────────────

export function clearMemoryCache(): void {
  memCache.clear();
  trendingCache.clear();
}

export async function clearAllCache(): Promise<void> {
  clearMemoryCache();
  try {
    await db.delete(cache);
  } catch (err) {
    console.error("[Cache] Clear all error:", err);
  }
}
