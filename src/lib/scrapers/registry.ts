import type { MangaResult } from "../scraper";
import * as cheerio from "cheerio";

// --- CLOUDFLARE BYPASS FETCHER ---
const SCRAPINGANT_KEY = process.env.SCRAPINGANT_KEY || "";

async function smartFetch(url: string, init?: RequestInit): Promise<Response> {
  // Domains protected by Cloudflare's "Just a moment..." browser challenge.
  // Plain fetch always 403s on these; routing through ScrapingAnt (a real
  // headless browser farm) solves the JS challenge and returns clean HTML.
  const protectedDomains = [
    "manhuatop.org",
    "manhuatop.com",
  ];
  const isProtected = protectedDomains.some(domain => url.includes(domain));

  if (isProtected && SCRAPINGANT_KEY) {
    // Route through ScrapingAnt to bypass Cloudflare Turnstile
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = "https://api.scrapingant.com/v2/general?url=" + encodedUrl + "&x-api-key=" + SCRAPINGANT_KEY + "&browser=true";
    console.log("[Bypass] Routing to Cloudflare Bypasser: " + url);
    return await fetch(apiUrl, { ...init, signal: AbortSignal.timeout(45000) }); 
  }

  return await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      ...((init?.headers as Record<string, string>) || {})
    },
    signal: init?.signal || AbortSignal.timeout(15000)
  });
}

/** Fetch HTML via smartFetch (handles Cloudflare-protected sites). Returns text or null. */
async function smartFetchHtml(url: string): Promise<string | null> {
  try {
    const res = await smartFetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
// ---------------------------------

import { browseSource1, browseSource2, browseSource3, browseSource4 } from "../scraper";
import type { ChapterInfo } from "../scraper";

// ════════════════════════════════════════════════════════════════════
// MANGANATO detail enrichment
//
// The catalog pages only carry title + cover + url. The actual chapter list
// and metadata are JavaScript-rendered, so a plain HTML scrape of the
// detail page returns NO chapters. Manganato exposes a JSON API for the
// chapter list, and the detail HTML still carries genres/status, so we
// fetch both to fully enrich each title during sync.
// ════════════════════════════════════════════════════════════════════

const MANGANATO_ORIGIN = "https://www.manganato.gg";

/** Fetch the full chapter list for a Manganato title via its JSON API. */
async function fetchManganatoChapters(slug: string): Promise<ChapterInfo[]> {
  try {
    const res = await smartFetch(`${MANGANATO_ORIGIN}/api/manga/${slug}/chapters`, {
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { chapters?: Array<{ chapter_name: string; chapter_slug: string; updated_at?: string }> } };
    const chs = json?.data?.chapters || [];
    return chs.map((c) => ({
      title: c.chapter_name,
      url: `${MANGANATO_ORIGIN}/manga/${slug}/${c.chapter_slug}`,
      date: c.updated_at ? c.updated_at.slice(0, 10) : "",
    }));
  } catch {
    return [];
  }
}

/** Fetch genres / status / alt titles from the detail page HTML. */
function parseManganatoMeta(html: string): { genres: string[]; status: string; altTitles: string[] } {
  try {
    const $ = cheerio.load(html);
    const genres: string[] = [];
    $(".genre-list a, .genres-wrap a").each((_, el) => {
      const g = $(el).text().trim();
      if (g && g.length > 1 && !genres.includes(g)) genres.push(g);
    });
    let status = "Ongoing";
    const bodyText = $("body").text();
    const sm = bodyText.match(/Status\s*:?\s*(Ongoing|Completed|Hiatus|Cancelled)/i);
    if (sm) status = sm[1].charAt(0).toUpperCase() + sm[1].slice(1).toLowerCase();
    let altTitles: string[] = [];
    const am = bodyText.match(/Alternative\s*:?\s*([^\n<]+)/i);
    if (am) altTitles = am[1].split(/[;,]/).map((s) => s.trim()).filter((s) => s && s.length > 1).slice(0, 8);
    return { genres, status, altTitles };
  } catch {
    return { genres: [], status: "Ongoing", altTitles: [] };
  }
}

/** Run async tasks with a small concurrency limit (to stay polite + within budget). */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Enrich Manganato catalog results with chapters + genres via the API/HTML. */
async function enrichManganato(results: MangaResult[]): Promise<MangaResult[]> {
  return mapWithConcurrency(results, 5, async (r) => {
    const slug = (r.url.split("/manga/")[1] || "").replace(/\/$/, "");
    if (!slug) return r;
    const [chapters, metaHtml] = await Promise.all([
      fetchManganatoChapters(slug),
      smartFetch(r.url).then((res) => (res.ok ? res.text() : null)).catch(() => null),
    ]);
    const meta = metaHtml ? parseManganatoMeta(metaHtml) : { genres: [], status: r.status, altTitles: [] };
    return {
      ...r,
      chapters,
      chapterCount: String(chapters.length || r.chapterCount),
      genres: meta.genres.length ? meta.genres : r.genres,
      status: meta.status || r.status,
    };
  });
}

export interface ScrapeResult {
  results: MangaResult[];
  hasMore: boolean;
}

export type ScraperFunction = (page: number) => Promise<ScrapeResult>;

const scrapers = new Map<string, ScraperFunction>();

export function registerScraper(source: string, fn: ScraperFunction) {
  scrapers.set(source.toLowerCase(), fn);
}

export async function browseSource(source: string, page: number): Promise<ScrapeResult | null> {
  const scraper = scrapers.get(source.toLowerCase());
  if (!scraper) {
    console.warn(`No scraper registered for ${source}`);
    return null;
  }
  
  try {
    return await scraper(page);
  } catch (err) {
    console.error(`Error in scraper ${source} page ${page}:`, err);
    return { results: [], hasMore: false };
  }
}

registerScraper("asura", async (page: number) => {
  const results = await browseSource1(page);
  return { results, hasMore: results.length > 0 };
});

registerScraper("demonic", async (page: number) => {
  const results = await browseSource2(page);
  return { results, hasMore: results.length > 0 };
});

registerScraper("scythe", async (page: number) => {
  const results = await browseSource3(page);
  return { results, hasMore: results.length > 0 };
});

registerScraper("webtoons", async (page: number) => {
  const results = await browseSource4(page);
  return { results, hasMore: results.length > 0 };
});

// Manganato full catalog lives at /manga-list/latest-manga?page=N (≈3,492 pages,
// ~20 titles each = ~70,000 titles). We detect the real last page dynamically
// from the pagination panel so hasMore stays correct even as the site grows.
const MANGANATO_BASE = "https://www.manganato.gg/manga-list/latest-manga";

function manganatoMaxPage($: cheerio.CheerioAPI): number {
  let max = 1;
  // The "Last(N)" link and any ?page=N links in the pagination panel
  $("a.page_blue, .panel_page_number a, .group_page a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/[?&]page=(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max;
}

registerScraper("manganato", async (page: number) => {
  try {
    const url = page <= 1 ? MANGANATO_BASE : `${MANGANATO_BASE}?page=${page}`;
    const res = await smartFetch(url);
    if (!res.ok) return { results: [], hasMore: false };
    const html = await res.text();
    const $ = cheerio.load(html);

    const maxPage = manganatoMaxPage($);
    const results: MangaResult[] = [];
    const seen = new Set<string>();

    // Catalog cards: <a class="list-story-item bookmark_check cover" href title><img></a>
    $(".list-story-item").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/manganato\.gg\/manga\/([a-z0-9][a-z0-9-]*)/i);
      if (!m) return; // skip chapter links
      const fullUrl = `https://www.manganato.gg/manga/${m[1]}`;
      if (seen.has(fullUrl)) return;

      const img = $(el).find("img").first();
      const coverUrl = img.attr("src") || img.attr("data-src") || "";
      let title = $(el).attr("title") || "";
      if (!title) title = img.attr("alt") || "";
      if (!title || title.length < 2) return;

      seen.add(fullUrl);
      results.push({
        title, description: "", rating: "N/A", status: "Ongoing", type: "Manga",
        genres: [], chapters: [], chapterCount: "0", coverUrl, url: fullUrl,
        source: "Manganato", author: "Unknown", artist: "Unknown",
      });
    });

    // Enrich each title with its chapter list (via JSON API) + genres/status
    // (via the detail HTML). Done within the worker's 60s budget (≈20 titles).
    const enriched = await enrichManganato(results);

    const hasMore = page < maxPage && enriched.length > 0;
    const withChapters = enriched.filter((r) => r.chapters.length > 0).length;
    console.log(`[Scraper] Manganato page ${page}: ${enriched.length} titles, ${withChapters} with chapters (max ${maxPage}), hasMore=${hasMore}`);
    return { results: enriched, hasMore };
  } catch (err) {
    console.error("[Scraper] Manganato error:", err instanceof Error ? err.message : err);
    return { results: [], hasMore: false };
  }
});

registerScraper("omega", async (page: number) => {
  try {
    const res = await smartFetch(`https://api.omegascans.org/query?query_string=&series_status=All&order=desc&orderBy=latest&series_type=Comic&page=${page}&perPage=15`);
    if (!res.ok) return { results: [], hasMore: false };
    const json = await res.json();
    const results: MangaResult[] = [];
    if (json.data && Array.isArray(json.data)) {
      for (const s of json.data) {
        results.push({
          title: s.title, description: s.description || "", rating: "N/A", status: s.status || "Unknown", type: "Manhwa",
          genres: [], chapters: [], chapterCount: "0", coverUrl: s.thumbnail || "", url: `https://omegascans.org/series/${s.series_slug}`,
          source: "Omega Scans", author: "Unknown", artist: "Unknown"
        });
      }
    }
    return { results, hasMore: json.meta?.current_page < json.meta?.last_page };
  } catch {
    return { results: [], hasMore: false };
  }
});

// ════════════════════════════════════════════════════════════════════
// SOURCE: MANHUATOP  (https://manhuatop.org)
// Madara WordPress theme, fully Cloudflare-protected → routed via smartFetch
// (which uses ScrapingAnt when SCRAPINGANT_KEY is set). Requires no key to
// register, but needs SCRAPINGANT_KEY at runtime to actually fetch pages.
// ════════════════════════════════════════════════════════════════════

const MANHUATOP_BASE = "https://manhuatop.org";

/** Parse a Madara manga detail page (chapters, meta, cover). */
function parseManhuaTopDetail(html: string, url: string): MangaResult | null {
  try {
    const $ = cheerio.load(html);
    const title = ($('meta[property="og:title"]').attr("content") || "")
      .replace(/\s*-\s*ManhuaTop.*$/i, "").trim()
      || $("h1, .post-title h1, .post-title h3").first().text().trim()
      || $("title").first().text().trim();
    if (!title) return null;

    const coverUrl = $('meta[property="og:image"]').attr("content")
      || $(".summary_image img").attr("data-src")
      || $(".summary_image img").attr("src") || "";

    // Description — Madara variants
    let description = "";
    $(".description-summary .summary__content p, .summary__content p, .manga-excerpt p, .content-morejs p").each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 40 && !description) description = t;
    });
    if (!description) description = ($('meta[property="og:description"]').attr("content") || "").trim();

    // Rating
    let rating = "N/A";
    const rm = $(".post-total-rating .score, .total_votes, .rating").first().text().trim().match(/(\d+\.?\d*)/);
    if (rm && parseFloat(rm[1]) <= 10) rating = rm[1];

    // Metadata rows (Status / Type / Author / Artist / Alternative)
    let status = "Ongoing", type = "Manhua", author = "Unknown", artist = "Unknown";
    const altTitles: string[] = [];
    $(".post-content_item").each((_, el) => {
      const label = $(el).find(".summary-heading").text().toLowerCase().trim();
      const value = $(el).find(".summary-content").text().trim();
      if (label.includes("status")) status = value || status;
      else if (label.includes("type")) type = value || type;
      else if (label.includes("author")) author = value || author;
      else if (label.includes("artist")) artist = value || artist;
      else if (label.includes("alternative")) value.split(/[,;]/).forEach((a) => { const x = a.trim(); if (x) altTitles.push(x); });
    });

    // Genres & tags
    const genres: string[] = [];
    $(".genres-content a, .tags-content a, .manga-genres a").each((_, el) => {
      const g = $(el).text().trim();
      if (g && g.length > 1 && !genres.includes(g)) genres.push(g);
    });

    // Chapters — Madara: li.wp-manga-chapter a / .version-chap a
    const chapters: ChapterInfo[] = [];
    $("li.wp-manga-chapter a, .version-chap a, .listing-chapters_wol a").each((_, el) => {
      const u = $(el).attr("href") || "";
      if (!u || !/chapter/i.test(u)) return;
      const chTitle = $(el).text().replace(/\s+/g, " ").trim();
      const date = $(el).closest("li, .wp-manga-chapter").find(".chapter-release-date, .chapter-time, i").text().trim();
      if (chTitle && u) chapters.push({
        title: chTitle,
        url: u.startsWith("http") ? u : `${MANHUATOP_BASE}${u}`,
        date,
      });
    });
    const uniqueChapters = dedupeChaptersReg(chapters);

    // Status detection fallback
    const pageText = $("body").text().toLowerCase();
    if (pageText.includes("completed") && status === "Ongoing") status = "Completed";

    return {
      title, description: description || "No description available.",
      rating, status, type, genres, chapters: uniqueChapters,
      chapterCount: String(uniqueChapters.length || 0),
      coverUrl, url, source: "ManhuaTop", author, artist,
    };
  } catch (err) {
    console.error("[Scraper] ManhuaTop detail error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Light-weight Madara listing parser (card → title/cover/url). */
function parseManhuaTopListing(html: string): MangaResult[] {
  const results: MangaResult[] = [];
  const seen = new Set<string>();
  try {
    const $ = cheerio.load(html);
    const push = (fullUrl: string, title: string, coverUrl: string, rating: string) => {
      if (!title || title.length < 3 || seen.has(fullUrl)) return;
      seen.add(fullUrl);
      results.push({
        title, description: "", rating, status: "Ongoing", type: "Manhua",
        genres: [], chapters: [], chapterCount: "0", coverUrl, url: fullUrl,
        source: "ManhuaTop", author: "Unknown", artist: "Unknown",
      });
    };

    // Madara cards
    $(".page-item-detail, .c-tabs-item__content, .row.c-tabs-item").each((_, el) => {
      const link = $(el).find("a[href*='/manga/']").first();
      const href = link.attr("href") || "";
      if (!href.includes("/manga/")) return;
      const fullUrl = href.startsWith("http") ? href : `${MANHUATOP_BASE}${href}`;
      const title = $(el).find(".post-title h3, .post-title h4, .tab-summary .post-title a").text().trim()
        || link.attr("title") || "";
      const coverUrl = $(el).find("img").attr("data-src") || $(el).find("img").attr("src") || "";
      const rm = $(el).find(".score, .total_votes").first().text().trim().match(/(\d+\.?\d*)/);
      const rating = rm && parseFloat(rm[1]) <= 10 ? rm[1] : "N/A";
      push(fullUrl, title, coverUrl, rating);
    });

    // Fallback: generic /manga/ links
    if (results.length === 0) {
      $("a[href*='/manga/']").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (!href.includes("/manga/") || href.includes("/page/") || href.includes("?")) return;
        const fullUrl = href.startsWith("http") ? href : `${MANHUATOP_BASE}${href}`;
        const title = $(el).find("h3, h4, .post-title").text().trim() || $(el).attr("title") || "";
        const coverUrl = $(el).find("img").attr("data-src") || $(el).find("img").attr("src") || "";
        push(fullUrl, title, coverUrl, "N/A");
      });
    }
  } catch (err) {
    console.error("[Scraper] ManhuaTop listing error:", err instanceof Error ? err.message : err);
  }
  return results;
}

/** Local chapter dedupe (registry-local, to avoid importing from scraper.ts). */
function dedupeChaptersReg(chapters: ChapterInfo[]): ChapterInfo[] {
  const seen = new Set<string>();
  const out: ChapterInfo[] = [];
  for (const ch of chapters) {
    const key = ch.url;
    if (key && !seen.has(key)) { seen.add(key); out.push(ch); }
  }
  return out;
}

registerScraper("manhuatop", async (page: number) => {
  try {
    // Madara archive: /manga/?m_orderby=latest & /page/N/
    const urls = [
      `${MANHUATOP_BASE}/manga/?m_orderby=latest`,
      `${MANHUATOP_BASE}/manga/page/${page}/?m_orderby=latest&column=4`,
    ];
    let allResults: MangaResult[] = [];
    for (const u of urls) {
      const html = await smartFetchHtml(u);
      if (html) allResults.push(...parseManhuaTopListing(html));
      if (allResults.length > 0) break; // first working URL is enough
    }
    if (allResults.length === 0) return { results: [], hasMore: false };

    // Enrich first batch with full detail (chapters/desc/genres) — concurrency 5
    const enriched = await mapWithConcurrency(allResults.slice(0, 20), 5, async (r) => {
      const html = await smartFetchHtml(r.url);
      return html ? (parseManhuaTopDetail(html, r.url) || r) : r;
    });

    // hasMore: page 1 had results and we're under a sane cap
    const hasMore = page < 3 && enriched.length > 0;
    console.log(`[Scraper] ManhuaTop page ${page}: ${enriched.length} titles, hasMore=${hasMore}`);
    return { results: enriched, hasMore };
  } catch (err) {
    console.error("[Scraper] ManhuaTop error:", err instanceof Error ? err.message : err);
    return { results: [], hasMore: false };
  }
});
