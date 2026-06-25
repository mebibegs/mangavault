import { NextRequest } from "next/server";
import sharp from "sharp";

const ALLOWED_HOSTS = [
  "pstatic.net",
  "webtoons.com",
  "cdnwebtoons.com",
  "2xstorage.com",
  "manganato.gg",
  "atsu.moe",
  "asurascans.com",
  "demonicscans.org",
  "scythescans.com",
  "omegascans.org",
  "media.omegascans.org",
];

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
  // Cap at 640 for thumbnails — full-resolution is only needed in the reader
  // (reader uses the proxy without a w= param, so width=0 = passthrough)
  const rawWidth = parseInt(req.nextUrl.searchParams.get("w") || "0", 10);
  const width = rawWidth > 0 ? Math.min(rawWidth, 640) : 0;
  const quality = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("q") || "80", 10)));

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ALLOWED_HOSTS.some((h) => parsedUrl.hostname.endsWith(h))) {
    return new Response(JSON.stringify({ error: "Host not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Determine the correct Referer based on the image host -----------
  const hostname = parsedUrl.hostname.toLowerCase();
  let referer = `https://${parsedUrl.hostname}/`;
  if (hostname.includes("pstatic.net") || hostname.includes("webtoons.com") || hostname.includes("cdnwebtoons.com")) {
    referer = "https://www.webtoons.com/";
  } else if (hostname.includes("asurascans.com")) {
    referer = "https://asurascans.com/";
  } else if (hostname.includes("demonicscans.org")) {
    referer = "https://demonicscans.org/";
  } else if (hostname.includes("scythescans.com")) {
    referer = "https://scythescans.com/";
  } else if (hostname.includes("manganato.gg") || hostname.includes("2xstorage.com")) {
    referer = "https://manganato.gg/";
  } else if (hostname.includes("atsu.moe")) {
    referer = "https://atsu.moe/";
  } else if (hostname.includes("omegascans.org")) {
    referer = "https://omegascans.org/";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const upstream = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: referer,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    // ------------------------------------------------------------------
    // Fast path: no resize requested → stream the original bytes through
    // ------------------------------------------------------------------
    if (!width) {
      const ct = upstream.headers.get("content-type") || "image/jpeg";
      const cl = upstream.headers.get("content-length") || "";
      const headers: Record<string, string> = {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "max-age=31536000",
        "Vercel-CDN-Cache-Control": "max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      };
      if (cl) headers["Content-Length"] = cl;
      return new Response(upstream.body, { status: 200, headers });
    }

    // ------------------------------------------------------------------
    // Resize path: buffer → sharp → WebP
    // ------------------------------------------------------------------
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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
