import { NextRequest, NextResponse } from "next/server";

// ─── Sliding window rate limiter ──────────────────────────────────────────────
interface WindowEntry { timestamps: number[]; }
const windows = new Map<string, WindowEntry>();

// Clean up every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 120_000;
    for (const [key, entry] of windows) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) windows.delete(key);
    }
  }, 5 * 60 * 1000);
}

interface RateLimitConfig { windowMs: number; max: number; }

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/image":    { windowMs: 60_000, max: 200 },
  "/api/reader":   { windowMs: 60_000, max: 15 },
  "/api/search":   { windowMs: 60_000, max: 30 },
  "/api/trending": { windowMs: 60_000, max: 30 },
  "/api/genres":   { windowMs: 60_000, max: 20 },
  "/api/csrf":     { windowMs: 60_000, max: 10 },
};

function checkRateLimit(ip: string, path: string): { allowed: boolean; remaining: number; resetMs: number } {
  // Match the most specific path
  const config = RATE_LIMITS[path] || Object.entries(RATE_LIMITS).find(([k]) => path.startsWith(k))?.[1];
  if (!config) return { allowed: true, remaining: 999, resetMs: 0 };

  const key = `${ip}:${path}`;
  const now = Date.now();
  const cutoff = now - config.windowMs;

  let entry = windows.get(key);
  if (!entry) { entry = { timestamps: [] }; windows.set(key, entry); }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  const remaining = Math.max(0, config.max - entry.timestamps.length);
  const resetMs = entry.timestamps.length > 0 ? entry.timestamps[0] + config.windowMs - now : config.windowMs;

  if (entry.timestamps.length >= config.max) {
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: remaining - 1, resetMs };
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ─── Adult gate — server-side cookie check ───────────────────────────────
  // The client-side gate sets `adult_verified=1` on confirm.
  // Here we enforce it at the middleware layer for non-API routes under /adult.
  if (pathname.startsWith("/adult") && !pathname.startsWith("/api/")) {
    const verified = req.cookies.get("adult_verified")?.value;
    if (verified !== "1") {
      // Redirect to the age-gate page; the client component will set the cookie
      // on confirm and redirect back. We pass the original path as `next` so
      // the gate can return users where they intended to go.
      const gate = req.nextUrl.clone();
      gate.pathname = "/adult";
      gate.searchParams.set("gate", "1");
      // Only redirect if not already on the gate itself to avoid loops
      if (!req.nextUrl.searchParams.has("gate")) {
        return NextResponse.redirect(gate);
      }
    }
  }

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const ip = getClientIp(req);
  const { allowed, remaining, resetMs } = checkRateLimit(ip, pathname);

  if (!allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(resetMs / 1000)),
        "X-RateLimit-Remaining": "0",
        "Content-Type": "text/plain",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/api/:path*", "/adult/:path*"],
};
