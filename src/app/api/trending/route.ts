import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { browseCatalog } from "@/lib/scraper";
import { upsertResults } from "@/lib/sync";
import { toSafeResult } from "@/lib/safeResult";
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

  try {
    // ──────────────────────────────────────────────────────────────────
    // L1/L2: Check multi-tier cache first
    // ──────────────────────────────────────────────────────────────────
    const cached = await getCachedTrending(page);
    if (cached) {
      logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });
      return NextResponse.json(
        {
          success: true,
          results: cached.results.map((d) => toSafeResult(d as unknown as Record<string, unknown>)),
          count: cached.results.length,
          page,
          hasMore: cached.hasMore,
          source: "cache",
        },
        {
          headers: {
            // 15 minute cache for trending
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
      const total = await titles.countDocuments();
      if (total > 0) {
        const results = await titles
          .find({ source: { $ne: "Omega Scans" } })
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const mapped = results.map((d) => toSafeResult(d as Record<string, unknown>));
        const data = {
          results: mapped as unknown as Parameters<typeof setCachedTrending>[1]["results"],
          hasMore: skip + results.length < total,
        };

        // Populate cache
        setCachedTrending(page, data).catch(() => {});

        logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });
        return NextResponse.json(
          {
            success: true,
            results: mapped,
            count: results.length,
            page,
            hasMore: data.hasMore,
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
      setCachedTrending(page, { results, hasMore }).catch(() => {});
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
