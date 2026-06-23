import * as cheerio from "cheerio";
import type { MangaResult, ChapterInfo } from "./scraper";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchMN(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

export const MANGANATO_GENRES = [
  "action","adaptation","adventure","comedy","demons","drama","ecchi",
  "fantasy","harem","heartwarming","historical","isekai","magic",
  "manga","manhua","manhwa","martial-arts","mecha","monsters","mystery",
  "psychological","reincarnation","revenge","romance","school-life",
  "shoujo","shounen","slice-of-life","super-power","supernatural",
  "survival","time-travel","tragedy","transmigration","vampires",
  "villainess","webtoons",
];

const SLUG_TO_GENRE: Record<string, string> = {
  "action":"Action","adaptation":"Adaptation","adventure":"Adventure",
  "comedy":"Comedy","demons":"Demons","drama":"Drama","ecchi":"Ecchi",
  "fantasy":"Fantasy","harem":"Harem","heartwarming":"Heartwarming",
  "historical":"Historical","isekai":"Isekai","magic":"Magic",
  "manga":"Manga","manhua":"Manhua","manhwa":"Manhwa",
  "martial-arts":"Martial Arts","mecha":"Mecha","monsters":"Monsters",
  "mystery":"Mystery","psychological":"Psychological",
  "reincarnation":"Reincarnation","revenge":"Revenge","romance":"Romance",
  "school-life":"School Life","shoujo":"Shoujo","shounen":"Shounen",
  "slice-of-life":"Slice of Life","super-power":"Super Power",
  "supernatural":"Supernatural","survival":"Survival",
  "time-travel":"Time Travel","tragedy":"Tragedy",
  "transmigration":"Transmigration","vampires":"Vampires",
  "villainess":"Villainess","webtoons":"Webtoons",
};

function parseManganatoListPage(html: string, genreName: string): MangaResult[] {
  const $ = cheerio.load(html);
  const cards = new Map<string, MangaResult>();

  $("a[href*='/manga/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.includes("manganato.gg/manga/") || href.includes("chapter")) return;
    if (cards.has(href)) return;

    const title = $(el).attr("title") || $(el).text().trim();
    if (!title || title.length < 2 || title.length > 300) return;

    // Find cover image — look in siblings and nearby containers
    let img = "";
    const parent = $(el).parent();
    const container = $(el).closest(".content-genres-item, .search-story-item, .item, li, div");
    img = parent.find("img").attr("src") || container.find("img").attr("src") || $(el).find("img").attr("src") || "";

    const fullUrl = href.startsWith("http") ? href : `https://www.manganato.gg${href}`;

    cards.set(href, {
      title,
      description: "",
      rating: "N/A",
      status: "Ongoing",
      type: "Manhwa",
      genres: genreName ? [genreName] : [],
      chapters: [],
      chapterCount: "0",
      coverUrl: img,
      url: fullUrl,
      source: "Manganato",
      author: "Unknown",
      artist: "Unknown",
    });
  });

  return [...cards.values()];
}

function getMaxPage(html: string): number {
  let max = 1;
  for (const m of html.matchAll(/page=(\d+)/g)) {
    const p = parseInt(m[1]);
    if (p > max) max = p;
  }
  return max;
}

/**
 * Scrape one Manganato genre with pagination.
 * Caps at maxPages to avoid scraping 800+ pages.
 */
export async function scrapeManganatoGenre(slug: string, maxPages = 10): Promise<MangaResult[]> {
  const genreName = SLUG_TO_GENRE[slug] || slug;
  const html1 = await fetchMN(`https://www.manganato.gg/genre/${slug}?page=1`);
  if (!html1) return [];

  const totalPages = Math.min(getMaxPage(html1), maxPages);
  const allResults = parseManganatoListPage(html1, genreName);

  // Fetch remaining pages in batches of 5
  for (let start = 2; start <= totalPages; start += 5) {
    const pages = Array.from({ length: Math.min(5, totalPages - start + 1) }, (_, i) => start + i);
    const htmls = await Promise.allSettled(
      pages.map((p) => fetchMN(`https://www.manganato.gg/genre/${slug}?page=${p}`))
    );
    for (const r of htmls) {
      if (r.status === "fulfilled" && r.value) {
        allResults.push(...parseManganatoListPage(r.value, genreName));
      }
    }
  }

  return allResults;
}

/**
 * Scrape all Manganato genres. Caps each genre at 10 pages (≈400 titles each)
 * to keep the total scrape time reasonable.
 */
export async function scrapeAllManganatoGenres(pagesPerGenre = 10): Promise<MangaResult[]> {
  const seen = new Map<string, MangaResult>();

  for (let i = 0; i < MANGANATO_GENRES.length; i += 3) {
    const batch = MANGANATO_GENRES.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((slug) => scrapeManganatoGenre(slug, pagesPerGenre))
    );
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const title of r.value) {
        const key = title.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length < 3) continue;
        if (!seen.has(key)) {
          seen.set(key, title);
        } else {
          const existing = seen.get(key)!;
          for (const g of title.genres) {
            if (!existing.genres.includes(g)) existing.genres.push(g);
          }
        }
      }
    }
  }

  return [...seen.values()];
}

/** Scrape Manganato "all" listing pages for the broadest collection */
export async function scrapeManganatoAll(maxPages = 50): Promise<MangaResult[]> {
  const seen = new Map<string, MangaResult>();

  for (let start = 1; start <= maxPages; start += 5) {
    const pages = Array.from({ length: Math.min(5, maxPages - start + 1) }, (_, i) => start + i);
    const htmls = await Promise.allSettled(
      pages.map((p) => fetchMN(`https://www.manganato.gg/genre/all?type=latest&state=all&page=${p}`))
    );
    for (const r of htmls) {
      if (r.status !== "fulfilled" || !r.value) continue;
      for (const title of parseManganatoListPage(r.value, "")) {
        const key = title.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length >= 3 && !seen.has(key)) seen.set(key, title);
      }
    }
  }

  return [...seen.values()];
}

/**
 * Get ALL Manganato manga URLs from their sitemap (87,000+).
 * Converts URL slugs directly to titles + cover URLs without
 * fetching each page (instant).
 */
export async function scrapeManganatoSitemap(limit = 10000): Promise<MangaResult[]> {
  const results: MangaResult[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= 9; i++) {
    const xml = await fetchMN(`https://www.manganato.gg/sitemap-comic-${i}.xml`);
    if (!xml) continue;

    for (const m of xml.matchAll(/<loc>(https:\/\/www\.manganato\.gg\/manga\/([^<]+))<\/loc>/g)) {
      if (results.length >= limit) break;
      const url = m[1];
      const slug = m[2];
      const title = decodeURIComponent(slug)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      const key = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key.length < 3 || seen.has(key)) continue;
      seen.add(key);

      results.push({
        title,
        description: "",
        rating: "N/A",
        status: "Ongoing",
        type: "Manhwa",
        genres: [],
        chapters: [],
        chapterCount: "0",
        coverUrl: `https://img-r2.2xstorage.com/thumb/${slug}.webp`,
        url,
        source: "Manganato",
        author: "Unknown",
        artist: "Unknown",
      });
    }
    if (results.length >= limit) break;
  }

  return results;
}

/** Search Manganato */
export async function searchManganato(query: string): Promise<MangaResult[]> {
  const slug = query.trim().toLowerCase().replace(/\s+/g, "_");
  const html = await fetchMN(`https://www.manganato.gg/search/story/${slug}`);
  if (!html) return [];
  return parseManganatoListPage(html, "");
}

/** Parse Manganato detail page for chapters */
export async function parseManganatoDetail(url: string): Promise<MangaResult | null> {
  const html = await fetchMN(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim() || $("title").text().split("-")[0].trim();
  if (!title) return null;

  const coverUrl = $(".info-image img").attr("src") || $("meta[property='og:image']").attr("content") || "";
  const description = $("meta[property='og:description']").attr("content") || $(".panel-story-info-description").text().trim() || "";
  let rating = "N/A";
  const rateText = $("em[property='v:average']").text().trim();
  if (rateText) rating = rateText;

  let status = "Ongoing", author = "Unknown", artist = "Unknown";
  const genres: string[] = [];

  $(".variations-tableInfo tr, .table-value").each((_, el) => {
    const label = $(el).find("td:first-child, .table-label").text().toLowerCase();
    const value = $(el).find("td:last-child, .table-value").text().trim();
    if (label.includes("status")) status = value || status;
    if (label.includes("author")) author = value || author;
    if (label.includes("artist")) artist = value || artist;
  });

  $(".genres-content a, a.a-h[href*='/genre/']").each((_, el) => {
    const g = $(el).text().trim();
    if (g && !genres.includes(g)) genres.push(g);
  });

  const chapters: ChapterInfo[] = [];
  $("a[href*='/chapter-']").each((_, el) => {
    const chUrl = $(el).attr("href") || "";
    const chTitle = $(el).text().trim();
    if (chUrl && chTitle) {
      const fullUrl = chUrl.startsWith("http") ? chUrl : `https://www.manganato.gg${chUrl}`;
      if (!chapters.find((c) => c.url === fullUrl)) {
        chapters.push({ title: chTitle, url: fullUrl, date: "" });
      }
    }
  });

  return {
    title, description: description || "No description available.", rating,
    status, type: "Manhwa", genres, chapters,
    chapterCount: String(chapters.length), coverUrl, url,
    source: "Manganato", author, artist,
  };
}
