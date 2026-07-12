import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT = 15;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  retryAfter: number;
  limited: boolean;
  blocked: boolean;
  reason?: string;
}

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT, "60 s"),
      prefix: "mangavault:api-search",
      analytics: true,
      ephemeralCache: false,
    })
  : null;

export async function isBlocked(_ip: string): Promise<{ blocked: boolean; expiresIn: number }> {
  return { blocked: false, expiresIn: 0 };
}

export async function blockIp(_ip: string, _durationSeconds = 3600): Promise<void> {
  // Blocking is handled by Upstash Ratelimit/proxy configuration.
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        remaining: 0,
        resetIn: 60,
        retryAfter: 60,
        limited: true,
        blocked: false,
        reason: "Rate limiter is not configured.",
      };
    }

    return {
      allowed: true,
      remaining: RATE_LIMIT,
      resetIn: 60,
      retryAfter: 0,
      limited: false,
      blocked: false,
    };
  }

  const result = await limiter.limit(ip);
  const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetIn: retryAfter,
    retryAfter: result.success ? 0 : retryAfter,
    limited: !result.success,
    blocked: false,
    reason: result.success ? undefined : "Rate limit exceeded.",
  };
}
