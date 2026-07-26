import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redisEnv";

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

const redis = getRedis();

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT, "60 s"),
      prefix: "mangavault:api-search",
      analytics: true,
      ephemeralCache: false,
    })
  : null;

const BLOCK_PREFIX = "mangavault:blocked:";
const DEFAULT_BLOCK_SECONDS = 3600;

export async function isBlocked(ip: string): Promise<{ blocked: boolean; expiresIn: number }> {
  if (!redis) return { blocked: false, expiresIn: 0 };
  try {
    const ttl = await redis.ttl(`${BLOCK_PREFIX}${ip}`);
    if (ttl > 0) return { blocked: true, expiresIn: ttl };
    return { blocked: false, expiresIn: 0 };
  } catch {
    return { blocked: false, expiresIn: 0 };
  }
}

export async function blockIp(ip: string, durationSeconds = DEFAULT_BLOCK_SECONDS): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`${BLOCK_PREFIX}${ip}`, "1", { ex: durationSeconds });
  } catch {
    // Best-effort — don't crash the request path
  }
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  // Check IP blocklist first
  const blockStatus = await isBlocked(ip);
  if (blockStatus.blocked) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: blockStatus.expiresIn,
      retryAfter: blockStatus.expiresIn,
      limited: false,
      blocked: true,
      reason: "IP is temporarily blocked.",
    };
  }

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
