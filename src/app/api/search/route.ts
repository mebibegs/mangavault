import { NextRequest, NextResponse } from "next/server";
import { searchAllSources } from "@/lib/scraper";
import { checkRateLimit, blockIp } from "@/lib/rate-limiter";
import { logRequest, logBlockedIp } from "@/lib/logger";

// Simple token validation - requests must come from your frontend
const VALID_ORIGINS = [
  "https://multi-manga-api-git-main-masondentalcolorado.vercel.app",
  "https://multi-manga-api.vercel.app",
  "http://localhost:3000",
];

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
  const browserIndicators = [/mozilla/i, /chrome/i, /safari/i, /firefox/i, /edge/i, /opera/i];
  const isBot = botPatterns.some((p) => p.test(ua));
  const isBrowser = browserIndicators.some((p) => p.test(ua));
  
  if (isBrowser) return false;
  return isBot;
}

function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  
  // Allow if origin matches
  if (origin && VALID_ORIGINS.some(valid => origin.startsWith(valid))) {
    return true;
  }
  
  // Allow if referer matches
  if (referer && VALID_ORIGINS.some(valid => referer.startsWith(valid))) {
    return true;
  }
  
  // Allow requests with no origin/referer (direct browser navigation)
  // But these are more suspicious for API calls
  if (!origin && !referer) {
    return false; // Block direct API calls without origin
  }
  
  return false;
}

function generateRequestToken(): string {
  // Simple time-based token that changes every 5 minutes
  const timeSlot = Math.floor(Date.now() / (5 * 60 * 1000));
  const secret = process.env.API_SECRET || "manga-vault-secret-2024";
  // Simple hash
  let hash = 0;
  const str = `${timeSlot}-${secret}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function validateRequestToken(token: string | null): boolean {
  if (!token) return false;
  
  const currentToken = generateRequestToken();
  // Also accept previous time slot's token (grace period)
  const timeSlot = Math.floor(Date.now() / (5 * 60 * 1000)) - 1;
  const secret = process.env.API_SECRET || "manga-vault-secret-2024";
  let hash = 0;
  const str = `${timeSlot}-${secret}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const previousToken = Math.abs(hash).toString(36);
  
  return token === currentToken || token === previousToken;
}

/**
 * GET /api/search?q=<query>
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const endpoint = "/api/search";
  const method = "GET";

  try {
    // 1. Bot detection
    if (isBotRequest(req)) {
      blockIp(ip, 86400);
      logBlockedIp(ip, "Bot detected");
      logRequest({ ipAddress: ip, endpoint, method, statusCode: 403, errorMessage: "Bot detected" });
      return NextResponse.json(
        { error: "Access denied.", message: "Automated requests are not allowed." },
        { status: 403 }
      );
    }

    // 2. Origin validation (optional - enable for stricter security)
    const strictMode = process.env.STRICT_ORIGIN_CHECK === "true";
    if (strictMode && !isValidOrigin(req)) {
      logRequest({ ipAddress: ip, endpoint, method, statusCode: 403, errorMessage: "Invalid origin" });
      return NextResponse.json(
        { error: "Access denied.", message: "Direct API access is not allowed." },
        { status: 403 }
      );
    }

    // 3. Token validation (optional - enable for even stricter security)
    const tokenMode = process.env.REQUIRE_TOKEN === "true";
    if (tokenMode) {
      const token = req.headers.get("x-request-token");
      if (!validateRequestToken(token)) {
        logRequest({ ipAddress: ip, endpoint, method, statusCode: 403, errorMessage: "Invalid token" });
        return NextResponse.json(
          { error: "Access denied.", message: "Invalid or expired request token." },
          { status: 403 }
        );
      }
    }

    // 4. Rate limiting
    const rateCheck = checkRateLimit(ip);

    if (rateCheck.blocked) {
      logBlockedIp(ip, rateCheck.reason || "Blocked for abuse");
      logRequest({ ipAddress: ip, endpoint, method, statusCode: 403, errorMessage: "IP blocked" });
      return NextResponse.json(
        { error: "Access temporarily restricted.", message: rateCheck.reason, retryAfter: rateCheck.retryAfter },
        { status: 403, headers: { "Retry-After": String(rateCheck.retryAfter) } }
      );
    }

    if (rateCheck.limited) {
      logRequest({ ipAddress: ip, endpoint, method, statusCode: 429, errorMessage: "Rate limited" });
      return NextResponse.json(
        { error: "Too Many Requests", message: rateCheck.reason, retryAfter: rateCheck.retryAfter },
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

    // 5. Validate query
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("q");

    if (!rawQuery || rawQuery.trim().length === 0) {
      logRequest({ ipAddress: ip, endpoint, method, statusCode: 400, errorMessage: "Missing query" });
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

    // 6. Search
    const results = await searchAllSources(query);

    logRequest({ ipAddress: ip, endpoint, method, statusCode: 200, query });

    return NextResponse.json(
      {
        success: true,
        results,
        count: results.length,
        query,
        rateLimit: { limit: 15, remaining: rateCheck.remaining, resetIn: rateCheck.resetIn },
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
    logRequest({ ipAddress: ip, endpoint, method, statusCode: 500, errorMessage: "Internal error" });
    return NextResponse.json(
      { error: "Internal Server Error", message: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}

// Export token generator for frontend to use
export async function POST(req: NextRequest) {
  // This endpoint provides the current token to the frontend
  const ip = getClientIp(req);
  
  // Rate limit token requests too
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Only allow from valid origins
  if (!isValidOrigin(req)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const token = generateRequestToken();
  return NextResponse.json({ token, expiresIn: 300 });
}
