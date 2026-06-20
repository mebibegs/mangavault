import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { searchAllSources } from "@/lib/scraper";
import { upsertResults } from "@/lib/sync";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logRequest } from "@/lib/logger";

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") || "127.0.0.1";
}

function sanitizeQuery(q: string): string {
  return q.replace(/[<>"'`;{}()\[\]\\\/]/g, "").trim().substring(0, 100);
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const rateCheck = checkRateLimit(ip);
    if (rateCheck.blocked || rateCheck.limited) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateCheck.retryAfter },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      );
    }

    const rawQuery = req.nextUrl.searchParams.get("q");
    if (!rawQuery || rawQuery.trim().length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "Query parameter 'q' is required." },
        { status: 400 }
      );
    }

    const query = sanitizeQuery(rawQuery);
    if (query.length < 2) {
      return NextResponse.json(
        { error: "Bad Request", message: "Query must be at least 2 characters." },
        { status: 400 }
      );
    }

    // Try MongoDB text search first
    const db = await getMongoDb();
    if (db) {
      const titles = db.collection("titles");
      const total = await titles.countDocuments();

      if (total > 0) {
        // Try text search
        let results = await titles
          .find(
            { $text: { $search: query } },
            { projection: { score: { $meta: "textScore" } } }
          )
          .sort({ score: { $meta: "textScore" } })
          .limit(50)
          .toArray();

        // If text search returned few results, try regex fallback
        if (results.length < 3) {
          const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          results = await titles
            .find({
              $or: [
                { title: regex },
                { description: regex },
                { genres: regex },
              ],
            })
            .limit(50)
            .toArray();
        }

        if (results.length > 0) {
          logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 200, query });

          return NextResponse.json({
            success: true,
            results: results.map(mongoDocToResult),
            count: results.length,
            query,
            source: "cache",
            rateLimit: { limit: 15, remaining: rateCheck.remaining, resetIn: rateCheck.resetIn },
          });
        }
      }
    }

    // Fallback: live scrape
    const results = await searchAllSources(query);

    // Upsert into MongoDB so next request is cached
    if (results.length > 0) {
      await upsertResults(results).catch(() => {});
    }

    logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 200, query });

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      query,
      source: "live",
      rateLimit: { limit: 15, remaining: rateCheck.remaining, resetIn: rateCheck.resetIn },
    });
  } catch (err) {
    console.error("Search API error:", err);
    logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 500, errorMessage: "Internal error" });
    return NextResponse.json(
      { error: "Internal Server Error", message: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}

function mongoDocToResult(doc: Record<string, unknown>) {
  return {
    title: doc.title as string || "",
    description: doc.description as string || "",
    rating: doc.rating as string || "N/A",
    status: doc.status as string || "Unknown",
    type: doc.type as string || "Manhwa",
    genres: (doc.genres as string[]) || [],
    chapters: (doc.chapters as { title: string; url: string; date: string }[]) || [],
    chapterCount: doc.chapterCount as string || "0",
    coverUrl: doc.coverUrl as string || "",
    url: doc.url as string || "",
    source: doc.source as string || "",
    author: doc.author as string || "Unknown",
    artist: doc.artist as string || "Unknown",
  };
}
