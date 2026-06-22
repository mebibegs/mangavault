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
 * Image proxy for Webtoons CDN.
 *
 * Webtoon-phinf.pstatic.net returns 403 unless the request carries
 *   Referer: https://www.webtoons.com/
 * Browsers can't be told to send a fake Referer, so we pipe the bytes
 * through this endpoint which adds the header server-side.
 *
 * Uses streaming (pipe body) instead of buffering the full ArrayBuffer
 * to avoid memory pressure when 100+ images load in parallel.
 */
export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get("url");

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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const upstream = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.webtoons.com/",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    // Stream the body directly — never buffer the full image in memory.
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const contentLength = upstream.headers.get("content-length") || "";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
      "Access-Control-Allow-Origin": "*",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}
