import { NextRequest, NextResponse } from "next/server";
import { searchAllSources } from "@/lib/scraper";
import { checkRateLimit, blockIp } from "@/lib/rate-limiter";
import { logRequest, logBlockedIp } from "@/lib/logger";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

function sanitizeQuery(q: string): string {
  return q
    .replace(/[<>"'`;{}()\[\]\\\/]/g, "")
    .trim()
    .substring(0, 100);
}

function isBotRequest(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") || "";
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /httpie/i,
  ];
  // Only block obvious automated bots, not browsers
  const browserIndicators = [/mozilla/i, /chrome/i, /safari/i, /firefox/i, /edge/i];
  const isBot = botPatterns.some((p) => p.test(ua));
  const isBrowser = browserIndicators.some((p) => p.test(ua));
  return isBot && !isBrowser;
}

/**
 * GET /api/search?q=<query>
 *
 * Searches multiple manga/manhwa sources in parallel.
 *
 * Rate Limit: 10 requests/minute per IP
 *
 * Response:
 *   200 - { success: true, results: [...], count: number, cached: boolean }
 *   400 - { error: "Query parameter 'q' is required" }
 *   429 - { error: "Rate limit exceeded", retryAfter: number }
 *   403 - { error: "Access denied" }
 *   500 - { error: "An error occurred while processing your request" }
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const endpoint = "/api/search";
  const method = "GET";

  try {
    // Bot detection
    if (isBotRequest(req)) {
      blockIp(ip, 86400);
      logBlockedIp(ip, "Bot detected").catch(() => {});
      logRequest({
        ipAddress: ip,
        endpoint,
        method,
        statusCode: 403,
        errorMessage: "Bot detected",
      }).catch(() => {});
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateCheck = checkRateLimit(ip);

    if (rateCheck.blocked) {
      logBlockedIp(ip, rateCheck.reason || "Blocked by rate limiter").catch(
        () => {}
      );
      logRequest({
        ipAddress: ip,
        endpoint,
        method,
        statusCode: 403,
        errorMessage: "IP blocked",
      }).catch(() => {});
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 }
      );
    }

    if (!rateCheck.allowed) {
      logRequest({
        ipAddress: ip,
        endpoint,
        method,
        statusCode: 429,
        errorMessage: "Rate limit exceeded",
      }).catch(() => {});
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateCheck.resetIn,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetIn),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateCheck.resetIn),
          },
        }
      );
    }

    // Validate query
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("q");

    if (!rawQuery || rawQuery.trim().length === 0) {
      logRequest({
        ipAddress: ip,
        endpoint,
        method,
        statusCode: 400,
        errorMessage: "Missing query",
      }).catch(() => {});
      return NextResponse.json(
        { error: "Query parameter 'q' is required." },
        { status: 400 }
      );
    }

    const query = sanitizeQuery(rawQuery);

    if (query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters." },
        { status: 400 }
      );
    }

    // Search all sources in parallel
    const results = await searchAllSources(query);

    // Log successful request
    logRequest({
      ipAddress: ip,
      endpoint,
      method,
      statusCode: 200,
      query,
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        results,
        count: results.length,
        query,
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "X-RateLimit-Reset": String(rateCheck.resetIn),
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (err) {
    console.error("Search API error:", err);
    logRequest({
      ipAddress: ip,
      endpoint,
      method,
      statusCode: 500,
      errorMessage: "Internal error",
    }).catch(() => {});

    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
