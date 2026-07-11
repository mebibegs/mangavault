import { NextRequest, NextResponse } from "next/server";
import { decryptImageToken } from "@/lib/crypto";
import { ALLOWED_CONTENT_TYPES, fetchValidatedImage, getImageReferer, parseAndValidateImageUrl } from "@/lib/imageSecurity";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  // Long cache — manga images are immutable once published
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "max-age=31536000",
  "Vercel-CDN-Cache-Control": "max-age=31536000",
  "X-Robots-Tag": "noindex",
  "Access-Control-Allow-Origin": "*",
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length < 10) return new NextResponse("Bad Request", { status: 400 });
  if (token.length > 4096) return new NextResponse("Token too large", { status: 400 });

  let realUrl: string;
  try {
    realUrl = decryptImageToken(decodeURIComponent(token));
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const parsed = parseAndValidateImageUrl(realUrl);
  if (!parsed) return new NextResponse("Forbidden", { status: 403 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let upstream: Response;
  try {
    upstream = await fetchValidatedImage(parsed, (url) => ({
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: getImageReferer(url),
      },
    }));
  } catch {
    clearTimeout(timeout);
    return new NextResponse("Bad Gateway", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) return new NextResponse("Image not found", { status: 404 });

  const contentType = upstream.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (contentType && !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const contentLength = parseInt(upstream.headers.get("content-length") ?? "0", 10);
  if (contentLength > 20 * 1024 * 1024) return new NextResponse("Payload Too Large", { status: 413 });

  const headers: Record<string, string> = {
    "Content-Type": contentType || "image/jpeg",
    ...SECURITY_HEADERS,
  };
  const upstreamContentLength = upstream.headers.get("content-length");
  if (upstreamContentLength) headers["Content-Length"] = upstreamContentLength;

  return new NextResponse(upstream.body, { status: 200, headers });
}
