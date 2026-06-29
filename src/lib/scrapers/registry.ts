import * as cheerio from "cheerio";

// --- CLOUDFLARE BYPASS FETCHER ---
const SCRAPINGANT_KEY = process.env.SCRAPINGANT_KEY || "";

async function smartFetch(url: string): Promise<Response> {
  const protectedDomains = ["mangafire.to", "flamecomics.xyz", "vortexscans.org", "mangago.me", "toongod.org", "webtoonscan.com", "mangavault.xyz"];
  const isProtected = protectedDomains.some(domain => url.includes(domain));

  if (isProtected && SCRAPINGANT_KEY) {
    // Route through ScrapingAnt to bypass Cloudflare Turnstile
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = "https://api.scrapingant.com/v2/general?url=" + encodedUrl + "&x-api-key=" + SCRAPINGANT_KEY + "&browser=true";
    console.log("[Bypass] Routing to Cloudflare Bypasser: " + url);
    return await fetch(apiUrl, { signal: AbortSignal.timeout(45000) }); 
  }

  return await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000)
  });
}
// ---------------------------------

import { browseSource1, browseSource2, browseSource3, browseSource4 } from "../scraper";

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

registerScraper("manganato", async (page: number) => {
  const res = await smartFetch(`https://manganato.com/genre-all/${page}`);
  if (!res.ok) return { results: [], hasMore: false };
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  
  $(".content-genres-item").each((_, el) => {
    const titleEl = $(el).find(".genres-item-name");
    const title = titleEl.text().trim();
    const url = titleEl.attr("href") || "";
    const imgEl = $(el).find("img");
    const coverUrl = imgEl.attr("src") || "";
    
    if (title && url) {
      results.push({
        title, description: "", rating: "N/A", status: "Unknown", type: "Manga",
        genres: [], chapters: [], chapterCount: "0", coverUrl, url,
        source: "Manganato", author: "Unknown", artist: "Unknown"
      });
    }
  });
  return { results, hasMore: results.length > 0 };
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




import type { MangaResult } from "../scraper";


const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Generic Madara theme scraper (ToonGod, WebtoonScan)
function parseMadara(html: string, sourceName: string, baseUrl: string): MangaResult[] {
  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  
  $(".page-item-detail").each((_, el) => {
    const titleEl = $(el).find("h3 a, h4 a");
    const title = titleEl.text().trim();
    const url = titleEl.attr("href") || "";
    const imgEl = $(el).find("img");
    const coverUrl = imgEl.attr("data-src") || imgEl.attr("src") || "";
    
    if (title && url) {
      results.push({
        title,
        description: "",
        rating: "N/A",
        status: "Unknown",
        type: "Manga",
        genres: [],
        chapters: [],
        chapterCount: "0",
        coverUrl,
        url: url.startsWith("http") ? url : `${baseUrl}${url}`,
        source: sourceName,
        author: "Unknown",
        artist: "Unknown"
      });
    }
  });
  return results;
}

// Generic MangaStream theme scraper (FlameComics, VortexScans)
function parseMangaStream(html: string, sourceName: string, baseUrl: string): MangaResult[] {
  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  
  $(".bsx").each((_, el) => {
    const linkEl = $(el).find("a");
    const title = linkEl.attr("title") || $(el).find(".tt").text().trim();
    const url = linkEl.attr("href") || "";
    const imgEl = $(el).find("img");
    const coverUrl = imgEl.attr("src") || "";
    
    if (title && url) {
      results.push({
        title,
        description: "",
        rating: "N/A",
        status: "Unknown",
        type: "Manga",
        genres: [],
        chapters: [],
        chapterCount: "0",
        coverUrl,
        url: url.startsWith("http") ? url : `${baseUrl}${url}`,
        source: sourceName,
        author: "Unknown",
        artist: "Unknown"
      });
    }
  });
  return results;
}

// FlameComics (Custom MangaStream)
registerScraper("flamecomics", async (page: number) => {
  const html = await fetchHtml(`https://flamecomics.xyz/series/?page=${page}`);
  if (!html) return { results: [], hasMore: false };
  const results = parseMangaStream(html, "FlameComics", "https://flamecomics.xyz");
  return { results, hasMore: results.length > 0 };
});

// ToonGod (Madara)
registerScraper("toongod", async (page: number) => {
  const html = await fetchHtml(`https://www.toongod.org/webtoons/page/${page}/`);
  if (!html) return { results: [], hasMore: false };
  const results = parseMadara(html, "ToonGod", "https://www.toongod.org");
  return { results, hasMore: results.length > 0 };
});

// WebtoonScan (Madara)
registerScraper("webtoonscan", async (page: number) => {
  const html = await fetchHtml(`https://webtoonscan.com/manga/page/${page}/`);
  if (!html) return { results: [], hasMore: false };
  const results = parseMadara(html, "WebtoonScan", "https://webtoonscan.com");
  return { results, hasMore: results.length > 0 };
});

// VortexScans (MangaStream/Custom)
registerScraper("vortexscans", async (page: number) => {
  const html = await fetchHtml(`https://vortexscans.org/series?page=${page}`);
  if (!html) return { results: [], hasMore: false };
  const results = parseMangaStream(html, "VortexScans", "https://vortexscans.org");
  return { results, hasMore: results.length > 0 };
});

// MangaGo (Custom)
registerScraper("mangago", async (page: number) => {
  const html = await fetchHtml(`https://www.mangago.me/home/mangalist/${page}/`);
  if (!html) return { results: [], hasMore: false };
  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  $(".pic_list li").each((_, el) => {
    const titleEl = $(el).find(".tit a");
    const title = titleEl.text().trim();
    const url = titleEl.attr("href") || "";
    const imgEl = $(el).find("img");
    const coverUrl = imgEl.attr("src") || "";
    if (title && url) {
      results.push({
        title, description: "", rating: "N/A", status: "Unknown", type: "Manga",
        genres: [], chapters: [], chapterCount: "0", coverUrl,
        url: url.startsWith("http") ? url : `https://www.mangago.me${url}`,
        source: "MangaGo", author: "Unknown", artist: "Unknown"
      });
    }
  });
  return { results, hasMore: results.length > 0 };
});

// MangaVault.xyz
registerScraper("mangavaultxyz", async (page: number) => {
  const html = await fetchHtml(`https://mangavault.xyz/manga/?page=${page}`);
  if (!html) return { results: [], hasMore: false };
  const results = parseMangaStream(html, "MangaVault", "https://mangavault.xyz");
  return { results, hasMore: results.length > 0 };
});

// MangaFire (Heavily protected, might need headless fallback, but providing standard pattern)
registerScraper("mangafire", async (page: number) => {
  const html = await fetchHtml(`https://mangafire.to/filter?page=${page}`);
  if (!html) return { results: [], hasMore: false };
  const $ = cheerio.load(html);
  const results: MangaResult[] = [];
  $(".item").each((_, el) => {
    const titleEl = $(el).find("a");
    const title = titleEl.text().trim();
    const url = titleEl.attr("href") || "";
    const imgEl = $(el).find("img");
    const coverUrl = imgEl.attr("src") || "";
    if (title && url) {
      results.push({
        title, description: "", rating: "N/A", status: "Unknown", type: "Manga",
        genres: [], chapters: [], chapterCount: "0", coverUrl,
        url: url.startsWith("http") ? url : `https://mangafire.to${url}`,
        source: "MangaFire", author: "Unknown", artist: "Unknown"
      });
    }
  });
  return { results, hasMore: results.length > 0 };
});

