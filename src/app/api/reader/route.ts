import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { buildProxiedImageUrl, decryptImageToken } from "@/lib/crypto";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

/** Cookies that bypass the Webtoons mature-content age gate. */
function webtoonCookies(): string {
  return [
    `ageGateV2=${Date.now()}`,
    "needGDPR=N",
    "needCCPA=N",
    "needCOPPA=N",
    "pagGDPR=true",
    "contentRating=adult",
    "locale=en",
    "country=US",
    "timezoneOffset=-300",
  ].join("; ");
}

export async function GET(req: NextRequest) {
  let chapterUrl = req.nextUrl.searchParams.get("url");

  if (!chapterUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // If the URL is encrypted (enc_ prefix), decrypt it first
  if (chapterUrl.startsWith("enc_")) {
    try {
      chapterUrl = decryptImageToken(chapterUrl.slice(4));
    } catch {
      return NextResponse.json({ error: "Invalid encrypted URL" }, { status: 403 });
    }
  }

  const allowed = [
    "demonicscans.org",
    "asurascans.com",
    "scythescans.com",
    "webtoons.com",
    "manganato.gg",
    "atsu.moe",
    "omegascans.org",
  ];
  let isAllowed = false;
  try {
    const parsed = new URL(chapterUrl);
    isAllowed = allowed.some((d) => parsed.hostname.includes(d));
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!isAllowed) {
    return NextResponse.json({ error: "Source not supported" }, { status: 403 });
  }

  try {
    // ────────────────────────────────────────────
    //  WEBTOONS — dedicated path
    // ────────────────────────────────────────────
    if (chapterUrl.includes("webtoons.com")) {
      return await handleWebtoon(chapterUrl);
    }

    // ────────────────────────────────────────────
    //  All other sources
    // ────────────────────────────────────────────
    const html = await fetchPage(chapterUrl, {
      ...BASE_HEADERS,
      Referer: chapterUrl,
    });
    if (!html) {
      return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 502 });
    }

    const $ = cheerio.load(html);
    const images: string[] = [];
    const seen = new Set<string>();

    // Asura fast-path
    if (chapterUrl.includes("asurascans.com")) {
      for (const m of html.matchAll(
        /https:\/\/cdn\.asurascans\.com\/asura-images\/chapters\/[^"'\\]+?\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?v=\d+)?/gi
      )) {
        const src = m[0].replace(/\\\//g, "/");
        if (!seen.has(src)) {
          seen.add(src);
          images.push(proxyUrl(src));
        }
      }
      if (images.length > 0) {
        return ok(images, chapterUrl);
      }
    }

    // Generic manga-reader selectors
    const selectors = [
      "#readerarea img",
      ".reading-content img",
      ".page-break img",
      ".rdminimal img",
      ".ch-images img",
      "#chapter-images img",
      ".container-chapter-reader img",
      ".wp-manga-chapter-img",
      ".reading-manga img",
      ".chapter-content img",
      ".manga-reader img",
      ".entry-content img",
      "#content img",
      "main img",
      "article img",
    ];

    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const src =
          $(el).attr("data-src") ||
          $(el).attr("data-lazy-src") ||
          $(el).attr("src") ||
          "";
        if (src && !seen.has(src) && isPanel(src)) {
          seen.add(src);
          images.push(proxyUrl(src));
        }
      });
      if (images.length >= 3) break;
    }

    // Fallback — all large images
    if (images.length < 3) {
      $("img").each((_, el) => {
        const src =
          $(el).attr("data-src") ||
          $(el).attr("data-lazy-src") ||
          $(el).attr("src") ||
          "";
        if (!src || seen.has(src) || !isPanel(src)) return;
        const w = parseInt($(el).attr("width") || "0");
        const h = parseInt($(el).attr("height") || "0");
        if ((w > 0 && w < 200) || (h > 0 && h < 200)) return;
        if (isJunk(src)) return;
        seen.add(src);
        images.push(proxyUrl(src));
      });
    }

    return ok(images, chapterUrl);
  } catch {
    return NextResponse.json({ error: "Failed to load chapter" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
//  WEBTOONS handler
// ──────────────────────────────────────────────────────────────

async function handleWebtoon(chapterUrl: string) {
  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    Cookie: webtoonCookies(),
    Referer: "https://www.webtoons.com/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
  };

  const html = await fetchPage(chapterUrl, headers);
  if (!html) {
    return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 502 });
  }

  const images = extractWebtoonImages(html);

  // If the first fetch returned the age-gate page (0 images), retry once.
  if (images.length === 0) {
    const retry = await fetchPage(chapterUrl, headers);
    if (retry) {
      const retryImages = extractWebtoonImages(retry);
      if (retryImages.length > 0) {
        return ok(retryImages, chapterUrl);
      }
    }
  }

  return ok(images, chapterUrl);
}

/**
 * Pull all panel images from a Webtoons viewer page.
 * Returns /api/img proxy URLs so the browser can load them
 * (the CDN requires Referer: https://www.webtoons.com/).
 */
function extractWebtoonImages(html: string): string[] {
  const $ = cheerio.load(html);
  const images: string[] = [];
  const seen = new Set<string>();

  // ① Primary: #_imageList img._images (the real panels)
  $("#_imageList img._images, #_imageList img[data-url]").each((_, el) => {
    const src = $(el).attr("data-url") || $(el).attr("data-src") || "";
    if (src && !seen.has(src) && src.startsWith("http")) {
      seen.add(src);
      images.push(proxyUrl(src));
    }
  });
  if (images.length > 0) return images;

  // ② Fallback: viewer content images
  $(".content_image img, .viewer_img img, .viewer_lst img").each((_, el) => {
    const src =
      $(el).attr("data-url") || $(el).attr("data-src") || $(el).attr("src") || "";
    if (src && !seen.has(src) && src.startsWith("http") && !isJunk(src)) {
      seen.add(src);
      images.push(proxyUrl(src));
    }
  });
  if (images.length > 0) return images;

  // ③ Regex fallback: find all webtoon CDN image URLs in raw HTML
  //    These are the full-resolution panel images, NOT thumbnails.
  //    Thumbnails contain "/thumb_" in the path; panels don't.
  for (const m of html.matchAll(
    /https:\/\/webtoon-phinf\.pstatic\.net\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp)\?type=q\d+/gi
  )) {
    const src = m[0];
    if (!seen.has(src) && !src.includes("/thumb_") && !src.includes("thumbnail")) {
      seen.add(src);
      images.push(proxyUrl(src));
    }
  }

  return images;
}

/** Wrap an image URL through the encrypted image proxy. */
function proxyUrl(raw: string): string {
  return buildProxiedImageUrl(raw);
}

// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────

async function fetchPage(
  url: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function ok(images: string[], source: string) {
  return NextResponse.json(
    { images, count: images.length, source },
    {
      headers: {
        // Long cache for chapter images — they don't change once published
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "CDN-Cache-Control": "max-age=86400",
        "Vercel-CDN-Cache-Control": "max-age=86400",
      },
    }
  );
}

function isPanel(url: string): boolean {
  if (!url || url.startsWith("data:") || url.startsWith("/") || url.startsWith("./"))
    return false;
  const l = url.toLowerCase();
  if (!l.startsWith("http")) return false;
  return (
    l.includes(".jpg") ||
    l.includes(".jpeg") ||
    l.includes(".png") ||
    l.includes(".webp") ||
    l.includes(".gif") ||
    l.includes(".avif") ||
    l.includes("/images/") ||
    l.includes("/uploads/") ||
    l.includes("/manga/") ||
    l.includes("/chapter/") ||
    l.includes("/comics/")
  );
}

const JUNK = [
  "logo","avatar","icon","banner","ad-","ads/","ads.","free_ad","ad_",
  "favicon","thumb","emoji","badge","button","spinner","loading","pixel",
  "tracking","analytics","1x1","demon-title","demon-logo","noimg",
  "/img/logo","cropped-","site-logo","header-","footer-","discord",
  "paypal","patreon","social",
];

function isJunk(src: string): boolean {
  const l = src.toLowerCase();
  return JUNK.some((j) => l.includes(j));
}
