export const ADULT_COOKIE_NAME = "adult_verified";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

function getAdultSecret(): string {
  return process.env.ADULT_COOKIE_SECRET
    || process.env.CSRF_SECRET
    || process.env.CRON_SECRET
    || "";
}

function base64Url(bytes: ArrayBuffer): string {
  const raw = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64Url(sig);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueAdultCookieValue(now = Date.now()): Promise<string> {
  const secret = getAdultSecret();
  if (!secret) throw new Error("ADULT_COOKIE_SECRET, CSRF_SECRET, or CRON_SECRET is required");

  const expiresAt = now + MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expiresAt}`;
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyAdultCookieValue(value: string | undefined | null, now = Date.now()): Promise<boolean> {
  if (!value) return false;

  const secret = getAdultSecret();
  if (!secret) return process.env.NODE_ENV !== "production" && value === "1";

  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = await hmac(payload, secret);
  return safeEqual(expected, parts[2]);
}

export const ADULT_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
