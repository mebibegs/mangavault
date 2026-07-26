import { NextRequest } from "next/server";
import sharp from "sharp";
import { ALLOWED_CONTENT_TYPES, fetchValidatedImage, getImageReferer, parseAndValidateImageUrl } from "@/lib/imageSecurity";
import { MANGAVAULT_BROWSER } from "@/lib/userAgent";

/**
 * Image proxy with on-the-fly resizing and WebP conversion via Sharp.
 *
 * Query params:
 *   - url:  source image URL (required)
 *   - w:    max width in px  (optional, 0 = original)
 *   - q:    quality 1-100    (optional, default 80)
 *
 * When `w` is provided the image is resized (aspect ratio preserved)
 * and transcoded to WebP, which is typically 30-50 % smaller than JPEG.
 *
 * Without `w` the original bytes are streamed through unchanged so the
 * chapter reader still gets full-resolution panels.
 */
export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get("url");
  const rawWidth = parseInt(req.nextUrl.searchParams.get("w") || "0", 10);
  const width = rawWidth > 0 ? Math.min(rawWidth, 640) : 0;
  const quality = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("q") || "80", 10)));

  if (!imageUrl) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const parsedUrl = parseAndValidateImageUrl(imageUrl);
  if (!parsedUrl) {
    return Response.json({ error: "Invalid image" }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    let upstream: Response;
    try {
      upstream = await fetchValidatedImage(parsedUrl, (url) => ({
        headers: {
          "User-Agent": MANGAVAULT_BROWSER,
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: getImageReferer(url),
          "sec-fetch-dest": "image",
          "sec-fetch-mode": "no-cors",
          "sec-fetch-site": "same-site",
        },
        signal: controller.signal,
      }));
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
    if (contentType && !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return Response.json({ error: "Unsupported content type" }, { status: 403 });
    }

    const contentLength = parseInt(upstream.headers.get("content-length") ?? "0", 10);
    if (contentLength > 20 * 1024 * 1024) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }

    if (!width) {
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "max-age=31536000",
        "Vercel-CDN-Cache-Control": "max-age=31536000",
        "X-Content-Type-Options": "nosniff",
      };
      const upstreamContentLength = upstream.headers.get("content-length");
      if (upstreamContentLength) headers["Content-Length"] = upstreamContentLength;
      return new Response(upstream.body, { status: 200, headers });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    const optimized = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    return new Response(new Uint8Array(optimized), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(optimized.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "max-age=31536000",
        "Vercel-CDN-Cache-Control": "max-age=31536000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
