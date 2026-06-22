import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const CSRF_TTL = 60 * 60; // 1 hour

function getSecret(): Buffer {
  const hex = process.env.CSRF_SECRET;
  if (!hex || hex.length < 64) return Buffer.alloc(32, 0);
  return Buffer.from(hex, "hex");
}

interface CsrfPayload {
  nonce: string;
  iat: number;
}

export function issueCsrfToken(): string {
  const payload: CsrfPayload = {
    nonce: randomBytes(16).toString("hex"),
    iat: Math.floor(Date.now() / 1000),
  };
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyCsrfToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expectedSig = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  let sigValid = false;
  try {
    sigValid = timingSafeEqual(Buffer.from(expectedSig, "base64url"), Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
  if (!sigValid) return false;

  let payload: CsrfPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (typeof payload.nonce !== "string" || typeof payload.iat !== "number") return false;

  const age = Math.floor(Date.now() / 1000) - payload.iat;
  if (age > CSRF_TTL || age < 0) return false;

  return true;
}
