import { Redis } from "@upstash/redis";

/**
 * Resolve Upstash Redis credentials from either naming scheme:
 *  - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (direct Upstash setup)
 *  - KV_REST_API_URL / KV_REST_API_TOKEN                (Vercel Marketplace / KV integration)
 * Returns null when neither pair is configured.
 */
export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}
