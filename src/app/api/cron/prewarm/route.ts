import { NextRequest, NextResponse } from "next/server";
import { getTopQueries, getCachedSearch, setCachedSearch, cleanupExpiredCache } from "@/lib/cache";
import { searchAllSources } from "@/lib/scraper";

export const maxDuration = 60;

/**
 * Cache pre-warming endpoint.
 * 
 * Fetches the top N most-searched queries and pre-warms the cache.
 * Also cleans up expired cache entries.
 * 
 * Designed to run every 10-15 minutes via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(50, Math.max(5, parseInt(limitParam || "20", 10) || 20));

  try {
    // First, clean up expired cache entries
    const cleaned = await cleanupExpiredCache();

    // Get top queries from PostgreSQL
    const topQueries = await getTopQueries(limit);

    if (topQueries.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No queries to prewarm yet",
        cleaned,
        warmed: 0,
      });
    }

    let warmed = 0;
    let skipped = 0;

    // Process queries sequentially to avoid overwhelming scrapers
    for (const query of topQueries) {
      // Check if already cached
      const existing = await getCachedSearch(query.query);
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Fetch and cache
      try {
        const results = await searchAllSources(query.query);
        if (results.length > 0) {
          await setCachedSearch(query.query, results);
          warmed++;
        }
      } catch {
        // Skip failed queries
      }

      // Small delay between queries to be respectful to upstream sources
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      totalQueries: topQueries.length,
      warmed,
      skipped,
      cleaned,
      protected: Boolean(cronSecret),
    });
  } catch (err) {
    console.error("Prewarm error:", err);
    return NextResponse.json({ error: "Prewarm failed" }, { status: 500 });
  }
}
