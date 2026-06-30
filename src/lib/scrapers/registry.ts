import type { MangaResult } from "../scraper";
import * as cheerio from "cheerio";

// --- CLOUDFLARE BYPASS FETCHER ---
const SCRAPINGANT_KEY = process.env.SCRAPINGANT_KEY || "";

async function smartFetch(url: string, init?: RequestInit): Promise<Response> {
  const protectedDomains: string[] = []; // Add heavily protected sites here if needed in the future
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
