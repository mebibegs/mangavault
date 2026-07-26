import { Ratelimit } from "@upstash/ratelimit";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { ADULT_COOKIE_NAME, verifyAdultCookieValue } from "@/lib/adultCookie";
import { getRedis } from "@/lib/redisEnv";

// CORS: API routes are same-origin only. Block cross-origin requests.
function blockCrossOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // server-side / same-origin requests have no Origin header

  try {
    const originHost = new URL(origin).hostname;
    const host = req.headers.get("host") || "";
    const allowedHosts = [host];
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      try { allowedHosts.push(new URL(process.env.NEXT_PUBLIC_BASE_URL).hostname); } catch {}
    }
    // Allow localhost for development
    if (originHost === "localhost" || originHost === "127.0.0.1") return null;
    if (allowedHosts.includes(originHost)) return null;
    return new NextResponse("Forbidden", { status: 403 });
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
}

interface RateLimitConfig {
  window: `${number} s` | `${number}s` | `${number} m` | `${number}m`;
  max: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/img": { window: "60 s", max: 200 },
  "/api/reader": { window: "60 s", max: 15 },
  "/api/search": { window: "60 s", max: 30 },
  "/api/trending": { window: "60 s", max: 30 },
  "/api/genres": { window: "60 s", max: 20 },
  "/api/csrf": { window: "60 s", max: 10 },
};

const redis = getRedis();

const limiters = new Map<string, Ratelimit>();

function getLimiter(routeKey: string, config: RateLimitConfig): Ratelimit | null {
  if (!redis) return null;

  const existing = limiters.get(routeKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.max, config.window),
    prefix: `mangavault:ratelimit:${routeKey.replace(/[^a-z0-9]/gi, ":")}`,
    analytics: true,
    ephemeralCache: false,
  });

  limiters.set(routeKey, limiter);
  return limiter;
}

function getRateLimitConfig(pathname: string): { routeKey: string; config: RateLimitConfig } | null {
  const exact = RATE_LIMITS[pathname];
  if (exact) return { routeKey: pathname, config: exact };

  const match = Object.entries(RATE_LIMITS)
    .filter(([routeKey]) => pathname.startsWith(routeKey))
    .sort(([a], [b]) => b.length - a.length)[0];

  return match ? { routeKey: match[0], config: match[1] } : null;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-real-ip")?.trim()
    || req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || "unknown";
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export async function proxy(req: NextRequest, event: NextFetchEvent): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Adult gate — server-side cookie check for non-API adult routes.
  if (pathname.startsWith("/adult") && !pathname.startsWith("/api/")) {
    const verified = await verifyAdultCookieValue(req.cookies.get(ADULT_COOKIE_NAME)?.value);
    if (!verified) {
      // Build a clean redirect URL — only include the gate param, never forward
      // the original query string (could leak tokens, search terms, etc.).
      const gate = new URL("/adult?gate=1", req.nextUrl.origin);
      if (!req.nextUrl.searchParams.has("gate")) {
        const res = NextResponse.redirect(gate);
        // Prevent Referer header from leaking the original URL
        res.headers.set("Referrer-Policy", "no-referrer");
        return res;
      }
    }
  }

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Block cross-origin requests to API routes (CSRF mitigation)
  const corsBlock = blockCrossOrigin(req);
  if (corsBlock) return corsBlock;

  const rateLimit = getRateLimitConfig(pathname);
  if (!rateLimit) return applySecurityHeaders(NextResponse.next());

  const limiter = getLimiter(rateLimit.routeKey, rateLimit.config);
  if (!limiter) {
    // No Redis credentials visible to the deployment. Fail OPEN so a missing
    // integration degrades to "no throttling" instead of a full API outage —
    // but log every request loudly so it shows up in Vercel logs.
    console.error(`[RateLimit] No Redis configured — ${pathname} allowed without rate limiting. Set UPSTASH_REDIS_REST_URL/TOKEN or attach Vercel KV.`);
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Mode", "disabled");
    return applySecurityHeaders(res);
  }

  try {
    const ip = getClientIp(req);
    const result = await limiter.limit(ip);
    event.waitUntil(result.pending);

    if (!result.success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.reset),
          "Content-Type": "text/plain",
        },
      });
    }

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    res.headers.set("X-RateLimit-Reset", String(result.reset));
    return applySecurityHeaders(res);
  } catch (error) {
    // Do not log the full error — it may contain Redis credentials
    console.error("Rate limit check failed:", error instanceof Error ? error.message : "unknown");
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Rate limit check failed" }, { status: 503 });
    }
    return applySecurityHeaders(NextResponse.next());
  }
}

export const config = {
  matcher: ["/api/:path*", "/adult", "/adult/:path*"],
};
