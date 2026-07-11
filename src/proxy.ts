import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  window: `${number} s` | `${number}s` | `${number} m` | `${number}m`;
  max: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/image": { window: "60 s", max: 200 },
  "/api/img": { window: "60 s", max: 200 },
  "/api/reader": { window: "60 s", max: 15 },
  "/api/search": { window: "60 s", max: 30 },
  "/api/trending": { window: "60 s", max: 30 },
  "/api/genres": { window: "60 s", max: 20 },
  "/api/csrf": { window: "60 s", max: 10 },
};

const hasRedisConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasRedisConfig ? Redis.fromEnv() : null;

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
    const verified = req.cookies.get("adult_verified")?.value;
    if (verified !== "1") {
      const gate = req.nextUrl.clone();
      gate.pathname = "/adult";
      gate.searchParams.set("gate", "1");
      if (!req.nextUrl.searchParams.has("gate")) {
        return NextResponse.redirect(gate);
      }
    }
  }

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const rateLimit = getRateLimitConfig(pathname);
  if (!rateLimit) return applySecurityHeaders(NextResponse.next());

  const limiter = getLimiter(rateLimit.routeKey, rateLimit.config);
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Rate limiter is not configured" }, { status: 503 });
    }

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Remaining", String(rateLimit.config.max));
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
    console.error("Rate limit check failed", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Rate limit check failed" }, { status: 503 });
    }
    return applySecurityHeaders(NextResponse.next());
  }
}

export const config = {
  matcher: ["/api/:path*", "/adult/:path*"],
};
