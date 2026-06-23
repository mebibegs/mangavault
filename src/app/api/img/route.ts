import { NextRequest } from "next/server";

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
 * Image proxy with optional resizing for performance.
 * 
 * Query params:
 *   - url: The source image URL (required)
 *   - w: Max width (optional, default: original)
 *   - q: Quality 1-100 (optional, default: 80)
 * 
 * For cover images displayed at ~300px width, use: /api/img?url=...&w=400&q=75
 */
export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get("url");
  const width = parseInt(req.nextUrl.searchParams.get("w") || "0", 10);
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

  if (!ALLOWED_HOSTS.some(h => parsedUrl.hostname.endsWith(h))) {
    return new Response(JSON.stringify({ error: "Host not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Determine the correct Referer header based on the image source
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
    const timeout = setTimeout(() => controller.abort(), 20000);

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

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    
    // If no resize requested, stream directly
    if (!width || width <= 0) {
      const contentLength = upstream.headers.get("content-length") || "";
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Vary": "Accept",
      };
      if (contentLength) headers["Content-Length"] = contentLength;
      return new Response(upstream.body, { status: 200, headers });
    }

    // For resizing, we need to buffer the image
    // In production, you'd use Sharp or a CDN like Cloudinary/imgix
    // For now, we'll pass through but with aggressive caching
    const contentLength = upstream.headers.get("content-length") || "";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "Vary": "Accept",
      // Hint to CDNs that this can be cached
      "CDN-Cache-Control": "max-age=31536000",
      "Vercel-CDN-Cache-Control": "max-age=31536000",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}
