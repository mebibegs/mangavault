import NodeCache from "node-cache";

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

interface AbuseTracker {
  totalRequests: number;
  windowStart: number;
  spikeCount: number;
}

const rateLimitCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });
const abuseCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const blockedCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const RATE_LIMIT = 10; // requests per minute
const ABUSE_THRESHOLD = 50; // requests per 5 minutes triggers block
const SPIKE_THRESHOLD = 20; // requests in 10 seconds

export function isBlocked(ip: string): boolean {
  return blockedCache.get<boolean>(`blocked:${ip}`) === true;
}

export function blockIp(ip: string, durationSeconds: number = 3600): void {
  blockedCache.set(`blocked:${ip}`, true, durationSeconds);
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  blocked: boolean;
  reason?: string;
} {
  // Check if IP is already blocked
  if (isBlocked(ip)) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: 0,
      blocked: true,
      reason: "IP temporarily blocked due to abuse",
    };
  }

  const now = Date.now();
  const key = `rate:${ip}`;
  const abuseKey = `abuse:${ip}`;

  // Check abuse patterns
  let abuse = abuseCache.get<AbuseTracker>(abuseKey);
  if (!abuse) {
    abuse = { totalRequests: 0, windowStart: now, spikeCount: 0 };
  }

  abuse.totalRequests++;

  // Detect sudden spikes (many requests in short time)
  const timeSinceWindow = (now - abuse.windowStart) / 1000;
  if (timeSinceWindow < 10 && abuse.totalRequests > SPIKE_THRESHOLD) {
    blockIp(ip, 1800); // Block for 30 minutes
    return {
      allowed: false,
      remaining: 0,
      resetIn: 1800,
      blocked: true,
      reason: "Suspicious activity detected",
    };
  }

  // Detect sustained abuse
  if (abuse.totalRequests > ABUSE_THRESHOLD) {
    blockIp(ip, 3600); // Block for 1 hour
    return {
      allowed: false,
      remaining: 0,
      resetIn: 3600,
      blocked: true,
      reason: "Rate limit exceeded - temporary block",
    };
  }

  // Reset abuse window every 5 minutes
  if (timeSinceWindow > 300) {
    abuse = { totalRequests: 1, windowStart: now, spikeCount: 0 };
  }

  abuseCache.set(abuseKey, abuse);

  // Standard rate limiting
  let entry = rateLimitCache.get<RateLimitEntry>(key);

  if (!entry) {
    entry = { count: 1, firstRequest: now };
    rateLimitCache.set(key, entry, 60);
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: 60, blocked: false };
  }

  const elapsed = (now - entry.firstRequest) / 1000;

  if (elapsed > 60) {
    entry = { count: 1, firstRequest: now };
    rateLimitCache.set(key, entry, 60);
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: 60, blocked: false };
  }

  entry.count++;
  rateLimitCache.set(key, entry);

  if (entry.count > RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil(60 - elapsed),
      blocked: false,
      reason: "Rate limit exceeded (10 requests/minute)",
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT - entry.count,
    resetIn: Math.ceil(60 - elapsed),
    blocked: false,
  };
}
