import { NextRequest, NextResponse } from "next/server";
import { decryptImageToken } from "@/lib/crypto";

// ─── Domain whitelist ─────────────────────────────────────────────────────────
const ALLOWED_DOMAINS: ReadonlySet<string> = new Set(
  (process.env.ALLOWED_IMAGE_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
);

function isAllowedDomain(hostname: string): boolean {
  const h = hostname.toLowerCase();
  for (const allowed of ALLOWED_DOMAINS) {
    if (h === allowed || h.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

// ─── SSRF blocklist ───────────────────────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./, /^::1$/, /^0\.0\.0\.0$/, /^169\.254\./,
  /^fc00:/i, /^fe80:/i, /\.internal$/i, /\.local$/i,
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(hostname));
}

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml",
]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "public, max-age=86400, immutable",
  "X-Robots-Tag": "noindex",
  "Access-Control-Allow-Origin": "*",
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length < 10) return new NextResponse("Bad Request", { status: 400 });
  if (token.length > 4096) return new NextResponse("Token too large", { status: 400 });

  // Decrypt and verify token
  let realUrl: string;
  try {
    realUrl = decryptImageToken(decodeURIComponent(token));
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(realUrl);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Only https
  if (parsed.protocol !== "https:") return new NextResponse("Forbidden", { status: 403 });
  // SSRF block
  if (isBlockedHost(parsed.hostname)) return new NextResponse("Forbidden", { status: 403 });
  // Domain whitelist
  if (!isAllowedDomain(parsed.hostname)) return new NextResponse("Forbidden", { status: 403 });

  // Fetch upstream
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let upstream: Response;
  try {
    upstream = await fetch(realUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: `https://${parsed.hostname}/`,
      },
      redirect: "follow",
    });
  } catch {
    clearTimeout(timeout);
    return new NextResponse("Bad Gateway", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) return new NextResponse("Image not found", { status: 404 });

  // Content-type validation
  const contentType = upstream.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (contentType && !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Size check (20MB max)
  const contentLength = parseInt(upstream.headers.get("content-length") ?? "0", 10);
  if (contentLength > 20 * 1024 * 1024) return new NextResponse("Payload Too Large", { status: 413 });

  // Stream response
  const headers: Record<string, string> = {
    "Content-Type": contentType || "image/jpeg",
    ...SECURITY_HEADERS,
  };
  if (upstream.headers.get("content-length")) {
    headers["Content-Length"] = upstream.headers.get("content-length")!;
  }

  return new NextResponse(upstream.body, { status: 200, headers });
}
