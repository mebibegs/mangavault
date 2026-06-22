import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { browseCatalog } from "@/lib/scraper";
import { upsertResults } from "@/lib/sync";
import { toSafeResult } from "@/lib/safeResult";
import { logRequest } from "@/lib/logger";

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") || "127.0.0.1";
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const pageParam = req.nextUrl.searchParams.get("page");
  const page = Math.max(1, Math.min(50, parseInt(pageParam || "1", 10) || 1));
  const limit = 30;
  const skip = (page - 1) * limit;

  try {
    const db = await getMongoDb();
    if (db) {
      const titles = db.collection("titles");
      const total = await titles.countDocuments();
      if (total > 0) {
        const results = await titles.find({ source: { $ne: "Source G" } }).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray();
        logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });
        return NextResponse.json({
          success: true,
          results: results.map((d) => toSafeResult(d as Record<string, unknown>)),
          count: results.length,
          page,
          hasMore: skip + results.length < total,
          source: "cache",
        });
      }
    }

    const { results, hasMore } = await browseCatalog(page);
    if (results.length > 0) await upsertResults(results).catch(() => {});
    logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });

    return NextResponse.json({
      success: true,
      results: results.map((r) => toSafeResult(r as unknown as Record<string, unknown>)),
      count: results.length,
      page,
      hasMore,
      source: "live",
    });
  } catch (err) {
    console.error("Trending error:", err);
    logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 500, errorMessage: "Internal error" });
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
