import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { browseCatalog } from "@/lib/scraper";
import { upsertResults } from "@/lib/sync";
import { toSafeResult, ADULT_GENRES } from "@/lib/safeResult";
import { logRequest } from "@/lib/logger";
import { getCachedTrending, setCachedTrending } from "@/lib/cache";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const pageParam = req.nextUrl.searchParams.get("page");
  const page = Math.max(1, Math.min(50, parseInt(pageParam || "1", 10) || 1));
  const limit = 30;
  const skip = (page - 1) * limit;
  const sortParam = req.nextUrl.searchParams.get("sort") || "latest";

  try {
    // ──────────────────────────────────────────────────────────────────
    // L1/L2: Check multi-tier cache first (sort-aware key)
    // ──────────────────────────────────────────────────────────────────
    const cached = await getCachedTrending(page, sortParam);
    if (cached) {
      logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });
      return NextResponse.json(
        {
          success: true,
          results: cached.results.map((d) => toSafeResult(d as unknown as Record<string, unknown>)),
          count: cached.results.length,
          total: cached.total,
          page,
          hasMore: cached.hasMore,
          source: "cache",
        },
        {
          headers: {
            "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
          },
        }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // L3: MongoDB
    // ──────────────────────────────────────────────────────────────────
    const db = await getMongoDb();
    if (db) {
      const titles = db.collection("titles");
      // Filter out adult content from regular trending
      const adultGenrePatterns = ADULT_GENRES.map(g => new RegExp(`^${g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
      const filter = { genres: { $not: { $in: adultGenrePatterns } } };
      const total = await titles.countDocuments(filter);
      if (total > 0) {
        let sort: Record<string, 1 | -1> = { publishedAt: -1, updatedAt: -1 };
        if (sortParam === "popular") {
          sort = { rating: -1, chapterCount: -1, publishedAt: -1, updatedAt: -1 };
        } else if (sortParam === "rating") {
          sort = { rating: -1, publishedAt: -1, updatedAt: -1 };
        } else if (sortParam === "chapters") {
          sort = { chapterCount: -1, publishedAt: -1, updatedAt: -1 };
        } else if (sortParam === "title") {
          sort = { title: 1 };
        }

        const results = await titles
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray();

        const mapped = results.map((d) => toSafeResult(d as Record<string, unknown>));
        const hasMore = skip + results.length < total;
        const data = {
          results: mapped as unknown as Parameters<typeof setCachedTrending>[1]["results"],
          hasMore,
          total,
        };

        // Populate cache (sort-aware)
        setCachedTrending(page, data, sortParam).catch(() => {});

        logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });
        return NextResponse.json(
          {
            success: true,
            results: mapped,
            count: results.length,
            total,
            page,
            hasMore,
            source: "mongodb",
          },
          {
            headers: {
              "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
            },
          }
        );
      }
    }

    // ──────────────────────────────────────────────────────────────────
    // L4: Live scrape
    // ──────────────────────────────────────────────────────────────────
    const { results, hasMore } = await browseCatalog(page);
    if (results.length > 0) {
      upsertResults(results).catch(() => {});
      setCachedTrending(page, { results, hasMore }, sortParam).catch(() => {});
    }

    logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });

    return NextResponse.json(
      {
        success: true,
        results: results.map((r) => toSafeResult(r as unknown as Record<string, unknown>)),
        count: results.length,
        page,
        hasMore,
        source: "live",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    console.error("Trending error:", err);
    logRequest({
      ipAddress: ip,
      endpoint: "/api/trending",
      method: "GET",
      statusCode: 500,
      errorMessage: "Internal error",
    });
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
