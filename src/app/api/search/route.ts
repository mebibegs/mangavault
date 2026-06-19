import { NextRequest, NextResponse } from "next/server";
import { searchAllSources } from "@/lib/scraper";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logRequest } from "@/lib/logger";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
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

    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("q");

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

    const results = await searchAllSources(query);

    logRequest({ ipAddress: ip, endpoint: "/api/search", method: "GET", statusCode: 200, query });

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      query,
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
