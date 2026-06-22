import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

// ─── Key loading ──────────────────────────────────────────────────────────────

function loadKey(envVar: string, label: string): Buffer {
  const hex = process.env[envVar];
  if (!hex || hex.length !== 64) {
    // Return a deterministic fallback for build-time / missing env
    // At runtime these will be set via Vercel env vars
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(hex, "hex");
}

const AES_KEY = () => loadKey("IMAGE_PROXY_SECRET", "IMAGE_PROXY_SECRET");
const HMAC_KEY = () => loadKey("IMAGE_HMAC_SECRET", "IMAGE_HMAC_SECRET");
const TTL = () => parseInt(process.env.IMAGE_TOKEN_TTL ?? "3600", 10);

// ─── Payload structures ───────────────────────────────────────────────────────

interface TokenPayload {
  url: string;
  iat: number;
  jti: string;
}

interface RefPayload {
  source: string;
  slug: string;
  iat: number;
  jti: string;
}

// ─── AES-256-GCM encrypt/decrypt ──────────────────────────────────────────────

function aesEncrypt(plaintext: string): string {
  const key = AES_KEY();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

function aesDecrypt(token: string): string {
  const key = AES_KEY();
  const buf = Buffer.from(token, "base64url");
  if (buf.length < 29) throw new Error("Token too short");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Token authentication failed — possible tampering");
  }
}

// ─── HMAC-SHA256 signing ──────────────────────────────────────────────────────

function sign(data: string): string {
  return createHmac("sha256", HMAC_KEY()).update(data).digest("base64url");
}

function verify(data: string, signature: string): boolean {
  const expected = sign(data);
  try {
    return timingSafeEqual(Buffer.from(expected, "base64url"), Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function encryptImageUrl(realUrl: string): string {
  const payload: TokenPayload = {
    url: realUrl,
    iat: Math.floor(Date.now() / 1000),
    jti: randomBytes(8).toString("hex"),
  };
  const encrypted = aesEncrypt(JSON.stringify(payload));
  const signature = sign(encrypted);
  return `${encrypted}.${signature}`;
}

export function decryptImageToken(token: string): string {
  const dot = token.lastIndexOf(".");
  if (dot === -1) throw new Error("Malformed token: missing signature");
  const encrypted = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  if (!verify(encrypted, signature)) throw new Error("Token signature invalid");
  const raw = aesDecrypt(encrypted);

  let payload: TokenPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Token payload is not valid JSON");
  }
  if (typeof payload.url !== "string" || typeof payload.iat !== "number") {
    throw new Error("Token payload missing required fields");
  }
  const age = Math.floor(Date.now() / 1000) - payload.iat;
  if (age > TTL()) throw new Error(`Token expired (age: ${age}s, ttl: ${TTL()}s)`);
  if (payload.iat > Math.floor(Date.now() / 1000) + 60) throw new Error("Token issued in the future");

  return payload.url;
}

export function encryptSourceRef(source: string, slug: string): string {
  const payload: RefPayload = {
    source,
    slug,
    iat: Math.floor(Date.now() / 1000),
    jti: randomBytes(8).toString("hex"),
  };
  const encrypted = aesEncrypt(JSON.stringify(payload));
  const signature = sign(encrypted);
  return `${encrypted}.${signature}`;
}

export function decryptSourceRef(ref: string): { source: string; slug: string } {
  const dot = ref.lastIndexOf(".");
  if (dot === -1) throw new Error("Malformed ref: missing signature");
  const encrypted = ref.slice(0, dot);
  const signature = ref.slice(dot + 1);

  if (!verify(encrypted, signature)) throw new Error("Ref signature invalid");
  const raw = aesDecrypt(encrypted);

  let payload: RefPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Ref payload is not valid JSON");
  }
  if (typeof payload.source !== "string" || typeof payload.slug !== "string") {
    throw new Error("Ref payload missing required fields");
  }
  const age = Math.floor(Date.now() / 1000) - payload.iat;
  if (age > TTL()) throw new Error(`Ref expired (age: ${age}s)`);

  return { source: payload.source, slug: payload.slug };
}

export function buildProxiedImageUrl(realUrl: string): string {
  if (!realUrl || realUrl.length < 5) return "";
  const token = encryptImageUrl(realUrl);
  return `/api/image?token=${encodeURIComponent(token)}`;
}
