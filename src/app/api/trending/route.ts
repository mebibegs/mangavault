import { NextRequest, NextResponse } from "next/server";
import { browseCatalog } from "@/lib/scraper";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logRequest } from "@/lib/logger";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

/**
 * GET /api/trending?page=1
 *
 * Returns paginated catalog from all sources.
 * 30 results per page, up to ~500 total.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const endpoint = "/api/trending";
  const method = "GET";

  try {
    const rateCheck = checkRateLimit(ip);
    if (rateCheck.blocked || rateCheck.limited) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateCheck.retryAfter },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      );
    }

    const url = new URL(req.url);
    const pageParam = url.searchParams.get("page");
    const page = Math.max(1, Math.min(17, parseInt(pageParam || "1", 10) || 1));

    const { results, hasMore } = await browseCatalog(page);

    logRequest({ ipAddress: ip, endpoint, method, statusCode: 200 });

    return NextResponse.json(
      {
        success: true,
        results,
        count: results.length,
        page,
        hasMore,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=600, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("Trending API error:", err);
    logRequest({ ipAddress: ip, endpoint, method, statusCode: 500, errorMessage: "Internal error" });
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
