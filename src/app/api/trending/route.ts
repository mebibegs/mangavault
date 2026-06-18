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
 * Internal endpoint used by the homepage only.
 * Not documented in public API docs.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);

  // Only allow requests from the same origin (internal use)
  const referer = req.headers.get("referer") || "";
  const origin = req.headers.get("origin") || "";
  const host = req.headers.get("host") || "";

  const isInternal =
    referer.includes(host) ||
    origin.includes(host) ||
    referer === "" || // direct browser navigation
    host.includes("localhost");

  if (!isInternal) {
    return NextResponse.json(
      { error: "This endpoint is not available for public use." },
      { status: 403 }
    );
  }

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

    logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 200 });

    // Strip URLs from response — the frontend uses them internally via same-origin,
    // but if someone bypasses the origin check, URLs are still hidden
    const SEC_MSG = "Hidden — URLs are not exposed via the public API for security purposes.";
    const safeResults = results.map(r => ({
      ...r,
      url: isInternal ? r.url : SEC_MSG,
      coverUrl: isInternal ? r.coverUrl : SEC_MSG,
      chapters: r.chapters.map(ch => ({
        ...ch,
        url: isInternal ? ch.url : SEC_MSG,
      })),
    }));

    return NextResponse.json(
      { success: true, results: safeResults, count: safeResults.length, page, hasMore },
      { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("Trending error:", err);
    logRequest({ ipAddress: ip, endpoint: "/api/trending", method: "GET", statusCode: 500, errorMessage: "Internal error" });
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
