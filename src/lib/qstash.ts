import { Receiver } from "@upstash/qstash";

/**
 * QStash signing keys are needed to verify webhook signatures, but only the
 * QSTASH_TOKEN is set in the deployment. The QStash API exposes the keys at
 * /v2/keys (authenticated with that token), so fetch them once and cache them
 * in module scope. Env-provided keys still win when present.
 */
let cachedKeys: { current: string; next: string } | null = null;
let keysFetchedAt = 0;
const KEYS_TTL_MS = 60 * 60 * 1000; // re-fetch hourly in case keys are rotated

async function getSigningKeys(): Promise<{ current?: string; next?: string }> {
  const envCurrent = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const envNext = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (envCurrent || envNext) return { current: envCurrent, next: envNext };

  const token = process.env.QSTASH_TOKEN;
  if (!token) return {};

  if (cachedKeys && Date.now() - keysFetchedAt < KEYS_TTL_MS) return cachedKeys;

  try {
    const base = (process.env.QSTASH_URL || "https://qstash.upstash.io").replace(/\/$/, "");
    const res = await fetch(`${base}/v2/keys`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`keys endpoint ${res.status}`);
    const json = (await res.json()) as { current?: string; next?: string };
    if (json.current) {
      cachedKeys = { current: json.current, next: json.next || json.current };
      keysFetchedAt = Date.now();
      return cachedKeys;
    }
  } catch (error) {
    console.error("[QStash] failed to fetch signing keys via QSTASH_TOKEN", error);
  }
  return cachedKeys || {};
}

/**
 * Verify that a request genuinely came from QStash (schedule or queue).
 * Returns the raw body on success, or null when the signature is missing/bad.
 * In non-production, unsigned requests are allowed for local testing.
 */
export async function readQStashVerifiedBody(req: Request): Promise<string | null> {
  const rawBody = await req.text();
  const signature = req.headers.get("upstash-signature");

  if (!signature) {
    return process.env.NODE_ENV !== "production" ? rawBody : null;
  }

  try {
    const { current, next } = await getSigningKeys();
    if (!current && !next) {
      console.error("[QStash] no signing keys available — set QSTASH_TOKEN (keys are auto-fetched) or QSTASH_CURRENT_SIGNING_KEY");
      return null;
    }
    const receiver = new Receiver({ currentSigningKey: current, nextSigningKey: next });
    const isValid = await receiver.verify({
      signature,
      body: rawBody,
      upstashRegion: req.headers.get("upstash-region") ?? undefined,
    });
    return isValid ? rawBody : null;
  } catch (error) {
    console.error("[QStash] signature verification failed", error);
    return null;
  }
}

/** Resolve the public base URL for QStash callbacks. */
export function resolveBaseUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("host") || "www.mangavault.in";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
