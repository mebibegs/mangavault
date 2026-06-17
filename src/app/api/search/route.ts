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
    /bot\b/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /^curl\//i,
    /^wget\//i,
    /python-requests/i,
    /^httpie\//i,
    /^java\//i,
    /^php\//i,
  ];
  // Only block obvious automated bots, not browsers
  const browserIndicators = [/mozilla/i, /chrome/i, /safari/i, /firefox/i, /edge/i, /opera/i];
  const isBot = botPatterns.some((p) => p.test(ua));
  const isBrowser = browserIndicators.some((p) => p.test(ua));
  
  // If it looks like a browser, allow it even if it has "bot" somewhere
  if (isBrowser) return false;
  
  // Block only if it matches bot patterns and has no browser indicators
  return isBot;
}

/**
 * GET /api/search?q=<query>
 *
 * Searches multiple manga/manhwa sources in parallel.
 *
 * Rate Limit: 15 requests/minute per IP
 *
 * Response:
 *   200 - { success: true, results: [...], count: number }
 *   400 - { error: "Query parameter 'q' is required" }
 *   429 - { error: "Rate limit exceeded", retryAfter: number }
 *   403 - { error: "Access denied" } (only for blocked IPs/bots)
 *   500 - { error: "An error occurred" }
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const endpoint = "/api/search";
  const method = "GET";

  try {
    // Bot detection - returns 403 (this is appropriate for bots)
    if (isBotRequest(req)) {
      blockIp(ip, 86400);
      logBlockedIp(ip, "Bot detected");
      logRequest({
        ipAddress: ip,
        endpoint,
        method,
        statusCode: 403,
        errorMessage: "Bot detected",
      });
      return NextResponse.json(
        { 
          error: "Access denied.",
          message: "Automated requests are not allowed. Please use a browser."
        },
        { status: 403 }
      );
    }

    // Rate limiting check
    const rateCheck = checkRateLimit(ip);

    // IP is blocked for abuse (severe cases only) - 403
    if (rateCheck.blocked) {
      logBlockedIp(ip, rateCheck.reason || "Blocked for abuse");
      logRequest({
        ipAddress: ip,
        endpoint,
        method,
        statusCode: 403,
        errorMessage: "IP blocked",
      });
      return NextResponse.json(
        {
          error: "Access temporarily restricted.",
          message: rateCheck.reason,
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 403,
          headers: {
            "Retry-After": String(rateCheck.retryAfter),
          },
        }
      );
    }

    // Rate limited (not blocked) - 429 Too Many Requests
    if (rateCheck.limited) {
      logRequest({
        ipAddress: ip,
        endpoint,
        method,
        statusCode: 429,
        errorMessage: "Rate limited",
      });
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: rateCheck.reason,
          retryAfter: rateCheck.retryAfter,
          limit: 15,
          remaining: 0,
          resetIn: rateCheck.resetIn,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfter),
            "X-RateLimit-Limit": "15",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + rateCheck.resetIn),
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
      });
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

    // Search all sources in parallel
    const results = await searchAllSources(query);

    // Log successful request
    logRequest({
      ipAddress: ip,
      endpoint,
      method,
      statusCode: 200,
      query,
    });

    return NextResponse.json(
      {
        success: true,
        results,
        count: results.length,
        query,
        rateLimit: {
          limit: 15,
          remaining: rateCheck.remaining,
          resetIn: rateCheck.resetIn,
        },
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": "15",
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + rateCheck.resetIn),
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
    });

    return NextResponse.json(
      { error: "Internal Server Error", message: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
