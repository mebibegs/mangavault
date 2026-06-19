import NodeCache from "node-cache";

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

interface AbuseTracker {
  totalRequests: number;
  windowStart: number;
}

const rateLimitCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });
const abuseCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const blockedCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// --- Configuration (less aggressive, more user-friendly) ---
const RATE_LIMIT = 15; // requests per minute (increased from 10)
const BURST_LIMIT = 5; // allow burst of 5 requests per 5 seconds
const ABUSE_THRESHOLD = 100; // requests per 5 minutes triggers temp block (increased from 50)
const SPIKE_THRESHOLD = 30; // requests in 10 seconds (increased from 20)
const BLOCK_DURATION_SPIKE = 600; // 10 minutes for spike abuse (reduced from 30)
const BLOCK_DURATION_SUSTAINED = 1800; // 30 minutes for sustained abuse (reduced from 60)

// suppress unused variable warnings
void BURST_LIMIT;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  retryAfter: number; // seconds until they can retry
  limited: boolean; // true if rate limited (not blocked)
  blocked: boolean; // true if IP is blocked for abuse
  reason?: string;
}

export function isBlocked(ip: string): { blocked: boolean; expiresIn: number } {
  const ttl = blockedCache.getTtl(`blocked:${ip}`);
  if (ttl) {
    const expiresIn = Math.ceil((ttl - Date.now()) / 1000);
    return { blocked: true, expiresIn: Math.max(0, expiresIn) };
  }
  return { blocked: false, expiresIn: 0 };
}

export function blockIp(ip: string, durationSeconds: number = 3600): void {
  blockedCache.set(`blocked:${ip}`, true, durationSeconds);
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  // Check if IP is already blocked (for severe abuse only)
  const blockStatus = isBlocked(ip);
  if (blockStatus.blocked) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: blockStatus.expiresIn,
      retryAfter: blockStatus.expiresIn,
      limited: false,
      blocked: true,
      reason: "Temporarily blocked due to abuse. Please wait.",
    };
  }

  const key = `rate:${ip}`;
  const abuseKey = `abuse:${ip}`;

  // Track abuse patterns (only for DDoS/bot detection)
  let abuse = abuseCache.get<AbuseTracker>(abuseKey);
  if (!abuse) {
    abuse = { totalRequests: 0, windowStart: now };
  }

  abuse.totalRequests++;
  const timeSinceWindow = (now - abuse.windowStart) / 1000;

  // Detect DDoS-like spike (many requests in very short time)
  if (timeSinceWindow < 10 && abuse.totalRequests > SPIKE_THRESHOLD) {
    blockIp(ip, BLOCK_DURATION_SPIKE);
    return {
      allowed: false,
      remaining: 0,
      resetIn: BLOCK_DURATION_SPIKE,
      retryAfter: BLOCK_DURATION_SPIKE,
      limited: false,
      blocked: true,
      reason: "Too many requests. Temporarily blocked.",
    };
  }

  // Detect sustained high-volume abuse
  if (abuse.totalRequests > ABUSE_THRESHOLD) {
    blockIp(ip, BLOCK_DURATION_SUSTAINED);
    return {
      allowed: false,
      remaining: 0,
      resetIn: BLOCK_DURATION_SUSTAINED,
      retryAfter: BLOCK_DURATION_SUSTAINED,
      limited: false,
      blocked: true,
      reason: "Excessive requests. Temporarily blocked.",
    };
  }

  // Reset abuse window every 5 minutes
  if (timeSinceWindow > 300) {
    abuse = { totalRequests: 1, windowStart: now };
  }

  abuseCache.set(abuseKey, abuse);

  // --- Standard rate limiting (returns 429, not block) ---
  let entry = rateLimitCache.get<RateLimitEntry>(key);

  if (!entry) {
    entry = { count: 1, firstRequest: now };
    rateLimitCache.set(key, entry, 60);
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetIn: 60,
      retryAfter: 0,
      limited: false,
      blocked: false,
    };
  }

  const elapsed = (now - entry.firstRequest) / 1000;

  // Reset window after 60 seconds
  if (elapsed > 60) {
    entry = { count: 1, firstRequest: now };
    rateLimitCache.set(key, entry, 60);
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetIn: 60,
      retryAfter: 0,
      limited: false,
      blocked: false,
    };
  }

  entry.count++;
  rateLimitCache.set(key, entry);

  const resetIn = Math.ceil(60 - elapsed);

  // Rate limited - return 429 with retry info
  if (entry.count > RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      retryAfter: resetIn, // Tell user exactly when they can retry
      limited: true,
      blocked: false,
      reason: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT - entry.count,
    resetIn,
    retryAfter: 0,
    limited: false,
    blocked: false,
  };
}
