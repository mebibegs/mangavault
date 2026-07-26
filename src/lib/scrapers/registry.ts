import type { MangaResult } from "../scraper";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

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

/**
 * Fetch HTML with retries + exponential backoff. 429/5xx responses and network
 * errors are retried; other statuses fail fast. Backoff is capped so the
 * worker stays inside its 60s budget.
 */
async function fetchHtmlWithRetry(url: string, retries = 3): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await smartFetch(url);
      if (res.ok) return await res.text();
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, Math.min(8000, 1500 * Math.pow(2, attempt)) + Math.random() * 500));
          continue;
        }
      }
      return null;
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  return null;
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

/**
 * Fetch the COMPLETE chapter list for a Manganato title via its JSON API.
 *
 * The API is paginated: it returns at most `limit` chapters per request
 * (default 50) and includes a `pagination` object:
 *   { total, limit, offset, has_more }
 * e.g. a manga with 364 chapters needs 8 pages of 50 to fetch them all.
 * We loop with offset until has_more is false. limit=100 halves the requests.
 */
async function fetchManganatoChapters(slug: string): Promise<ChapterInfo[]> {
  const LIMIT = 100;
  let offset = 0;
  const all: ChapterInfo[] = [];

  try {
    while (true) {
      const res = await smartFetch(
        `${MANGANATO_ORIGIN}/api/manga/${slug}/chapters?limit=${LIMIT}&offset=${offset}`,
        { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } }
      );
      if (!res.ok) break;
      const json = (await res.json()) as {
        data?: {
          chapters?: Array<{ chapter_name: string; chapter_slug: string; updated_at?: string }>;
          pagination?: { total?: number; limit?: number; has_more?: boolean };
        };
      };
      const data = json?.data;
      const chs = data?.chapters || [];
      if (chs.length === 0) break;

      for (const c of chs) {
        all.push({
          title: c.chapter_name,
          url: `${MANGANATO_ORIGIN}/manga/${slug}/${c.chapter_slug}`,
          date: c.updated_at ? c.updated_at.slice(0, 10) : "",
        });
      }

      // Stop if the API says there are no more pages.
      const hasMore = data?.pagination?.has_more === true;
      if (!hasMore) break;
      offset += chs.length;

      // Safety net against runaway loops (e.g. a manga with 10k chapters).
      if (offset > 12000) break;
    }
  } catch {
    // Return whatever we collected so far rather than nothing.
  }
  return all;
}

/**
 * Strip the "<Title> summary:" / "Overview:" / "About ...:" label that Manganato
 * prefixes to the description block, in any of its wordings. The title itself
 * may contain colons, so match up to the LAST label word near the start.
 */
function stripDescriptionLabel(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized
    .replace(/^.{0,150}?\b(summary|overview|about|description|synopsis)\s*:\s*/i, "")
    .trim();
}

/** True for site-chrome/boilerplate blocks that are not a real description. */
function isBoilerplateDescription(text: string): boolean {
  return !text
    || text.length < 30
    || /new feature|reading history|manganato automatically|read .{0,80} online for free/i.test(text);
}

/** Fetch description / genres / status / alt titles from the detail page HTML. */
function parseManganatoMeta(html: string): { description: string; genres: string[]; status: string; altTitles: string[]; author: string; artist: string } {
  try {
    const $ = cheerio.load(html);
    const genres: string[] = [];
    $(".genre-list a, .genres-wrap a").each((_, el) => {
      const g = $(el).text().trim();
      if (g && g.length > 1 && !genres.includes(g)) genres.push(g);
    });

    // Description: the site renders it as a div whose heading text is
    // "<Title> summary:" — but the label varies (summary / overview / about /
    // description / synopsis). Find the heading, take its container's text.
    let description = "";
    $("h1, h2, h3, h4").each((_, el) => {
      if (description) return;
      const heading = $(el).text().trim();
      if (!/\b(summary|overview|about|description|synopsis)\s*:?\s*$/i.test(heading)) return;
      const container = $(el).parent();
      const candidate = stripDescriptionLabel(container.text());
      if (!isBoilerplateDescription(candidate)) description = candidate.slice(0, 2000);
    });
    // Fallback: known description containers, then og:description
    if (!description) {
      for (const sel of ["#panel-story-info-description", ".panel-story-info-description", ".story-info-description", ".dsct"]) {
        const candidate = stripDescriptionLabel($(sel).first().text());
        if (!isBoilerplateDescription(candidate)) { description = candidate.slice(0, 2000); break; }
      }
    }
    if (!description) {
      const og = ($('meta[property="og:description"]').attr("content") || "").trim();
      if (!isBoilerplateDescription(og)) description = og.slice(0, 2000);
    }

    let status = "Ongoing";
    const bodyText = $("body").text();
    const sm = bodyText.match(/Status\s*:?\s*(Ongoing|Completed|Hiatus|Cancelled)/i);
    if (sm) status = sm[1].charAt(0).toUpperCase() + sm[1].slice(1).toLowerCase();
    let altTitles: string[] = [];
    const am = bodyText.match(/Alternative\s*:?\s*([^\n<]+)/i);
    if (am) altTitles = am[1].split(/[;,]/).map((s) => s.trim()).filter((s) => s && s.length > 1).slice(0, 8);

    // Author / Artist extraction from info table rows
    let author = "Unknown";
    let artist = "Unknown";
    $(".info-list .row, .post-status .row, .panel-story-info-detail .row").each((_, el) => {
      const label = $(el).find(".col-4, .summary-heading, td:first-child").text().toLowerCase().trim();
      const value = $(el).find(".col-8, .summary-content, td:last-child").text().trim();
      if (label.includes("author") && value && value !== "Updating" && author === "Unknown") {
        author = value.replace(/\s*\(Author\)/i, "").trim();
      }
      if (label.includes("artist") && value && value !== "Updating" && artist === "Unknown") {
        artist = value.replace(/\s*\(Artist\)/i, "").trim();
      }
    });

    return { description, genres, status, altTitles, author, artist };
  } catch {
    return { description: "", genres: [], status: "Ongoing", altTitles: [], author: "Unknown", artist: "Unknown" };
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

/** Enrich Manganato catalog results with chapters + description/genres via the API/HTML. */
async function enrichManganato(results: MangaResult[]): Promise<MangaResult[]> {
  return mapWithConcurrency(results, 5, async (r) => {
    const slug = (r.url.split("/manga/")[1] || "").replace(/\/$/, "");
    if (!slug) return r;
    const [chapters, metaHtml] = await Promise.all([
      fetchManganatoChapters(slug),
      fetchHtmlWithRetry(r.url, 2),
    ]);
    const meta = metaHtml
      ? parseManganatoMeta(metaHtml)
      : { description: "", genres: [], status: r.status, altTitles: [], author: "Unknown", artist: "Unknown" };
    return {
      ...r,
      chapters,
      chapterCount: String(chapters.length || r.chapterCount),
      description: meta.description || r.description,
      genres: meta.genres.length ? meta.genres : r.genres,
      status: meta.status || r.status,
      author: meta.author !== "Unknown" ? meta.author : r.author,
      artist: meta.artist !== "Unknown" ? meta.artist : r.artist,
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

export function hasRegisteredScraper(source: string): boolean {
  return scrapers.has(source.toLowerCase());
}

export function listRegisteredScrapers(): string[] {
  return [...scrapers.keys()];
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
    // A thrown error is transient by definition — keep the chain alive and
    // let the worker's empty-streak limit stop genuinely dead sources.
    return { results: [], hasMore: true };
  }
}

// For paginated HTML sources an empty page can mean either "end of catalog"
// or "transient fetch failure" — the two are indistinguishable from []. We
// report hasMore=true and let the worker's empty-streak limit (5 consecutive
// dead pages) terminate the chain, so one bad page can't kill a full sync.
registerScraper("asura", async (page: number) => {
  const results = await browseSource1(page);
  return { results, hasMore: true };
});

registerScraper("demonic", async (page: number) => {
  const results = await browseSource2(page);
  return { results, hasMore: true };
});

registerScraper("scythe", async (page: number) => {
  const results = await browseSource3(page);
  return { results, hasMore: true };
});

// Webtoons is a single-page catalog (see browseSource4) — page 2+ is a real
// end signal, not a failure, so hasMore stays false.
registerScraper("webtoons", async (page: number) => {
  const results = await browseSource4(page);
  return { results, hasMore: false };
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
    const html = await fetchHtmlWithRetry(url, 3);
    // Distinguish "fetch failed" from "past the last page": on failure keep
    // hasMore=true so QStash re-queues the next page instead of killing the
    // whole chain mid-catalog.
    if (!html) {
      console.warn(`[Scraper] Manganato page ${page}: fetch failed after retries`);
      return { results: [], hasMore: true };
    }
    const $ = cheerio.load(html);

    const maxPage = manganatoMaxPage($);
    const results: MangaResult[] = [];
    const seen = new Set<string>();

    const addCard = (href: string, el: AnyNode) => {
      const m = href.match(/manga\/([a-z0-9][a-z0-9-]*)/i);
      if (!m) return;
      const fullUrl = `https://www.manganato.gg/manga/${m[1]}`;
      if (seen.has(fullUrl)) return;

      const link = $(el);
      const img = link.find("img").first();
      const coverUrl = img.attr("src") || img.attr("data-src") || "";
      let title = link.attr("title") || img.attr("alt") || "";
      if (!title || title.length < 2) title = link.text().replace(/\s+/g, " ").trim();
      if (!title || title.length < 2) return;

      seen.add(fullUrl);
      results.push({
        title, description: "", rating: "N/A", status: "Ongoing", type: "Manga",
        genres: [], chapters: [], chapterCount: "0", coverUrl, url: fullUrl,
        source: "Manganato", author: "Unknown", artist: "Unknown",
      });
    };

    // Catalog cards: <a class="list-story-item bookmark_check cover" href title><img></a>
    $(".list-story-item").each((_, el) => addCard($(el).attr("href") || "", el));

    // Fallback if the card class changes: any /manga/{slug} link on the page
    if (results.length === 0) {
      $("a[href*='/manga/']").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href.includes("/manga/page") || href.includes("?")) return;
        addCard(href, el);
      });
    }

    // Enrich each title with its chapter list (via JSON API) + description/
    // genres/status (via the detail HTML). Done within the worker's 60s
    // budget (≈20 titles).
    const enriched = await enrichManganato(results);

    const hasMore = page < maxPage && enriched.length > 0;
    const withChapters = enriched.filter((r) => r.chapters.length > 0).length;
    console.log(`[Scraper] Manganato page ${page}: ${enriched.length} titles, ${withChapters} with chapters (max ${maxPage}), hasMore=${hasMore}`);
    return { results: enriched, hasMore };
  } catch (err) {
    console.error("[Scraper] Manganato error:", err instanceof Error ? err.message : err);
    // Transient failure — keep the chain alive; worker empty-streak stops dead sources.
    return { results: [], hasMore: true };
  }
});

function omegaChapters(seriesSlug: string, raw: { free_chapters?: Record<string, unknown>[]; paid_chapters?: Record<string, unknown>[] }): ChapterInfo[] {
  const chapters = [...(raw.free_chapters || []), ...(raw.paid_chapters || [])]
    .filter((chapter) => typeof chapter.chapter_slug === "string")
    .map((chapter) => ({
      title: [chapter.chapter_name, chapter.chapter_title].filter(Boolean).join(" - ") || String(chapter.chapter_slug),
      url: `https://omegascans.org/series/${seriesSlug}/${chapter.chapter_slug}`,
      date: typeof chapter.created_at === "string" ? chapter.created_at.slice(0, 10) : "",
    }));
  return dedupeChaptersReg(chapters);
}

registerScraper("omega", async (page: number) => {
  try {
    const url = `https://api.omegascans.org/query?query_string=&series_status=All&order=desc&orderBy=latest&series_type=Comic&page=${page}&perPage=15`;
    let json: { data?: Array<Record<string, unknown>>; meta?: { current_page?: number; last_page?: number } } | null = null;
    for (let attempt = 0; attempt <= 2 && !json; attempt++) {
      try {
        const res = await smartFetch(url);
        if (res.ok) { json = await res.json(); break; }
        if (res.status !== 429 && res.status < 500) break;
      } catch { /* retry */ }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    // Transient failure: keep the chain alive, let the worker's empty-streak stop it.
    if (!json) return { results: [], hasMore: true };
    const results: MangaResult[] = [];
    if (json.data && Array.isArray(json.data)) {
      for (const s of json.data) {
        const chapters = omegaChapters(s.series_slug as string, s);
        results.push({
          title: s.title as string, description: (s.description as string) || "", rating: s.rating ? String(s.rating) : "N/A", status: (s.status as string) || "Unknown", type: "Manhwa",
          genres: Array.isArray(s.tags) ? (s.tags as Array<{ name?: string } | string>).map((tag) => typeof tag === "string" ? tag : tag.name).filter(Boolean) as string[] : [],
          chapters,
          chapterCount: String((s.meta as { chapters_count?: number } | undefined)?.chapters_count || chapters.length || 0), coverUrl: (s.thumbnail as string) || "", url: `https://omegascans.org/series/${s.series_slug}`,
          source: "Omega Scans", author: (s.author as string) || "Unknown", artist: (s.artist as string) || "Unknown"
        });
      }
    }
    return { results, hasMore: (json.meta?.current_page ?? 0) < (json.meta?.last_page ?? 0) };
  } catch {
    return { results: [], hasMore: true };
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

/**
 * Detect the maximum pagination page from a ManhuaTop archive page.
 *
 * The /manhua/ archive exposes pagination links like /manhua/page/727/ and a
 * "Page X of 727" title. We extract the largest page number from both forms.
 */
function manhuaTopMaxPage(html: string): number {
  let max = 1;
  // Pagination links: /manhua/page/N/  OR  /manhua-genre/{g}/page/N/
  for (const m of html.matchAll(/\/(?:manhua|manhua-genre\/[a-z-]+)\/page\/(\d+)/gi)) {
    max = Math.max(max, parseInt(m[1], 10));
  }
  // "Page X of Y" in the archive title
  const titleMatch = html.match(/Page\s+\d+\s+of\s+(\d+)/i);
  if (titleMatch) max = Math.max(max, parseInt(titleMatch[1], 10));
  return max;
}

/** Detect whether a page is the "Page not found" (404) archive end. */
function manhuaTopIsNotFound(html: string): boolean {
  const t = html.toLowerCase();
  return t.includes("page not found")
    || t.includes("nothing found")
    || /<h1[^>]*>.*404/i.test(html);
}

/**
 * Parse a ManhuaTop listing/genre page into manga cards.
 *
 * IMPORTANT: ManhuaTop's detail-page URLs are at /manhua/{slug}/ (NOT /manga/),
 * even though the archive index lives at /manga/. The Madara cards use:
 *   <a href="https://manhuatop.org/manhua/{slug}/" title="Title">
 */
function parseManhuaTopListing(html: string): MangaResult[] {
  const results: MangaResult[] = [];
  const seen = new Set<string>();
  const BAD = new Set(["HOME - Manhwa Manhua Top", "Manhwa Manhua Top", "New Release",
    "Popular Manga", "Latest Update", "Popular Genres", "Trending Manhwa", "Top Comics",
    "Top Manhua", "Top Manhwa", "My bookmarks", "Sign in", "Sign up", "Register", "Settings",
    "Read Manga", "New manga to read weekly", "ManhuaTop", "Spoiler"]);

  try {
    const $ = cheerio.load(html);
    const push = (fullUrl: string, title: string, coverUrl: string) => {
      if (!title || title.length < 3 || seen.has(fullUrl) || BAD.has(title)) return;
      // filter nav/genre labels
      if (/^(Latest|Popular|Top |New |Trending|All |Best |Manhua |Manhwa |Read )/i.test(title)) return;
      seen.add(fullUrl);
      results.push({
        title, description: "", rating: "N/A", status: "Ongoing", type: "Manhua",
        genres: [], chapters: [], chapterCount: "0", coverUrl, url: fullUrl,
        source: "ManhuaTop", author: "Unknown", artist: "Unknown",
      });
    };

    const extractCard = (link: cheerio.Cheerio<AnyNode>) => {
      const href = link.attr("href") || "";
      // must be a detail page: /manhua/{slug}/ or /manga/{slug}/, not genre/page
      const isDetail = /\/(manhua|manga)\/[a-z0-9][a-z0-9-]+\/?$/i.test(href)
        || /\/(manhua|manga)\/[a-z0-9][a-z0-9-]+$/i.test(href);
      if (!isDetail || href.includes("/page/") || href.includes("?") || href.includes("-genre/")) return;

      const fullUrl = href.startsWith("http") ? href : `${MANHUATOP_BASE}${href}`;
      // Title: prefer the title= attribute, then inner/parent h3-h5 text, then link text
      let title = link.attr("title") || "";
      if (!title) title = link.find("h3, h4, h5, .post-title").text().trim();
      if (!title) title = link.parent("h3, h4, h5").text().trim(); // <h3><a>Title</a></h3>
      if (!title) title = link.closest(".post-title").text().trim();
      if (!title) title = link.text().replace(/\s+/g, " ").trim();
      // Cover: look in the card, sibling img, or parent container
      let coverUrl = link.find("img").attr("src") || link.find("img").attr("data-src") || "";
      if (!coverUrl) {
        const card = link.closest(".page-item-detail, .c-tabs-item__content, .row, .item, .bsx, .listupd, .tab-thumb, .item-thumb");
        coverUrl = card.find("img").attr("src") || card.find("img").attr("data-src") || "";
      }
      push(fullUrl, title, coverUrl);
    };

    // Primary: Madara card links with /manhua/{slug}/ (and fallback /manga/)
    $("a[href*='/manhua/'], a[href*='/manga/']").each((_, el) => extractCard($(el)));

    // Fallback: h3 > a structure (archive listing format)
    if (results.length === 0) {
      $("h3 a, h4 a").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (/\/(manhua|manga)\//.test(href)) extractCard($(el));
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

/**
 * ManhuaTop catalog scraper.
 *
 * The full public archive lives at /manhua/ with /manhua/page/N/ pagination:
 *   page 1     → https://manhuatop.org/manhua/
 *   page 2..N  → https://manhuatop.org/manhua/page/{N}/
 *
 * Verified totals: 8,722 titles across 727 pages (12 per page, 10 on the last).
 * Page 728 returns a 404 "Page not found" → that's our stop signal.
 *
 * The site is Cloudflare-protected, so each page load goes through ScrapingAnt
 * (real headless browser, ~40-50s/call). One listing page per worker call
 * stays within the 60s budget. ~727 pages × ~12 titles = full 8,722-title
 * coverage synced over ~727 background worker invocations.
 */
registerScraper("manhuatop", async (page: number) => {
  try {
    // Archive pagination: page 1 = /manhua/, page N = /manhua/page/N/
    const listUrl = page <= 1
      ? `${MANHUATOP_BASE}/manhua/`
      : `${MANHUATOP_BASE}/manhua/page/${page}/`;

    // Single ScrapingAnt call (fits within 60s budget — no in-process retry;
    // failures keep hasMore=true so the chain retries via QStash backoff).
    const html = await smartFetchHtml(listUrl);
    if (!html || html.includes("Just a moment")) {
      console.warn(`[Scraper] ManhuaTop page ${page}: CF challenge or empty`);
      return { results: [], hasMore: page < 800 };
    }

    // 404 "Page not found" → we've passed the last archive page (728+).
    if (manhuaTopIsNotFound(html)) {
      console.log(`[Scraper] ManhuaTop page ${page}: end of archive (404)`);
      return { results: [], hasMore: false };
    }

    const maxPage = manhuaTopMaxPage(html);
    const results = parseManhuaTopListing(html);

    // hasMore: current page is under the detected max page and returned titles.
    const hasMore = results.length > 0 && page < maxPage;
    console.log(`[Scraper] ManhuaTop page ${page}/${maxPage}: ${results.length} titles, hasMore=${hasMore}`);
    return { results, hasMore };
  } catch (err) {
    console.error("[Scraper] ManhuaTop error:", err instanceof Error ? err.message : err);
    // Transient failure — keep the chain alive; worker empty-streak stops dead sources.
    return { results: [], hasMore: page < 800 };
  }
});
