import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

/**
 * GET /api/reader?url=<chapter_url>
 *
 * Fetches a chapter page, extracts only manga panel images,
 * and returns them as a JSON array of image URLs.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chapterUrl = url.searchParams.get("url");

  if (!chapterUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate URL is from known sources
  const allowed = ["demonicscans.org", "asurascans.com", "scythescans.com"];
  let isAllowed = false;
  try {
    const parsed = new URL(chapterUrl);
    isAllowed = allowed.some(d => parsed.hostname.includes(d));
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!isAllowed) {
    return NextResponse.json({ error: "Source not supported" }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(chapterUrl, {
      headers: { ...HEADERS, Referer: chapterUrl },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 502 });
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const images: string[] = [];
    const seen = new Set<string>();

    // Source-specific fast path: Asura embeds page image URLs in JSON-ish props
    if (chapterUrl.includes("asurascans.com")) {
      const pageUrlMatches = html.matchAll(/https:\/\/cdn\.asurascans\.com\/asura-images\/chapters\/[^"'\\]+?\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?v=\d+)?/gi);
      for (const m of pageUrlMatches) {
        const src = m[0].replace(/\\\//g, "/");
        if (!seen.has(src)) {
          seen.add(src);
          images.push(src);
        }
      }
      // If Asura JSON yielded images, return immediately after dedupe/filter.
      if (images.length > 0) {
        return NextResponse.json(
          { images, count: images.length, source: chapterUrl },
          { headers: { "Cache-Control": "public, max-age=3600" } }
        );
      }
    }

    // Common manga reader image selectors across different sites
    const selectors = [
      // DemonicScans
      "#readerarea img",
      ".reading-content img",
      ".page-break img",
      // Asura / general
      ".rdminimal img",
      ".ch-images img",
      "#chapter-images img",
      ".container-chapter-reader img",
      // ScytheScans / Madara
      ".wp-manga-chapter-img",
      ".reading-manga img",
      // Generic fallbacks
      ".chapter-content img",
      ".manga-reader img",
      ".entry-content img",
      "#content img",
      "main img",
      "article img",
    ];

    // Try each selector
    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const src = $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src") || "";
        if (src && !seen.has(src) && isImageUrl(src)) {
          seen.add(src);
          images.push(src);
        }
      });
      // If we found panel images with a specific selector, stop looking
      if (images.length >= 3) break;
    }

    // If selectors didn't find enough, scan ALL img tags and filter
    if (images.length < 3) {
      $("img").each((_, el) => {
        const src = $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src") || "";
        const width = parseInt($(el).attr("width") || "0");
        const height = parseInt($(el).attr("height") || "0");

        if (!src || seen.has(src) || !isImageUrl(src)) return;

        // Skip tiny images (icons, avatars, logos, ads)
        if (width > 0 && width < 200) return;
        if (height > 0 && height < 200) return;

        // Skip common non-content patterns
        const lower = src.toLowerCase();
        if (lower.includes("logo") || lower.includes("avatar") || lower.includes("icon") ||
            lower.includes("banner") || lower.includes("ad-") || lower.includes("ads/") ||
            lower.includes("ads.") || lower.includes("free_ad") || lower.includes("ad_") ||
            lower.includes("favicon") || lower.includes("thumb") || lower.includes("emoji") ||
            lower.includes("badge") || lower.includes("button") || lower.includes("spinner") ||
            lower.includes("loading") || lower.includes("pixel") || lower.includes("tracking") ||
            lower.includes("analytics") || lower.includes("1x1") || lower.includes("demon-title") ||
            lower.includes("demon-logo") || lower.includes("noimg") || lower.includes("/img/logo") ||
            lower.includes("cropped-") || lower.includes("site-logo") || lower.includes("header-") ||
            lower.includes("footer-") || lower.includes("discord") || lower.includes("paypal") ||
            lower.includes("patreon") || lower.includes("social")) return;

        seen.add(src);
        images.push(src);
      });
    }

    return NextResponse.json(
      { images, count: images.length, source: chapterUrl },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to load chapter" }, { status: 500 });
  }
}

function isImageUrl(url: string): boolean {
  if (!url || url.startsWith("data:") || url.startsWith("/") || url.startsWith("./")) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith("http")) return false;
  return (
    lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".png") ||
    lower.includes(".webp") || lower.includes(".gif") || lower.includes(".avif") ||
    lower.includes("/images/") || lower.includes("/uploads/") || lower.includes("/manga/") ||
    lower.includes("/chapter/") || lower.includes("/comics/")
  );
}
