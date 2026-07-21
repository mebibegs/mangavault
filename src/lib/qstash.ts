import { Receiver } from "@upstash/qstash";

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
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    const receiver =
      currentSigningKey || nextSigningKey
        ? new Receiver({ currentSigningKey, nextSigningKey })
        : new Receiver();
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
