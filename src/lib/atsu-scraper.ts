import * as cheerio from "cheerio";
import type { MangaResult } from "./scraper";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchAtsu(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

/**
 * Get all manga URLs from the Atsu.moe sitemap.
 */
export async function getAtsuSitemapUrls(): Promise<string[]> {
  const xml = await fetchAtsu("https://atsu.moe/sitemap-manga.xml");
  if (!xml) return [];
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>(https:\/\/atsu\.moe\/manga\/[^<]+)<\/loc>/g)) {
    urls.push(m[1]);
  }
  return urls;
}

/**
 * Parse an Atsu.moe manga page using SSR'd meta tags.
 */
function parseAtsuMeta(html: string, url: string): MangaResult | null {
  const $ = cheerio.load(html);
  const title = $('meta[property="og:title"]').attr("content") || "";
  if (!title || title.length < 2) return null;
  const description = $('meta[property="og:description"]').attr("content") || "";
  const coverUrl = $('meta[property="og:image"]').attr("content") || "";

  return {
    title,
    description: description || "No description available.",
    rating: "N/A",
    status: "Ongoing",
    type: "Manhwa",
    genres: [],
    chapters: [],
    chapterCount: "0",
    coverUrl,
    url,
    source: "Atsu",
    author: "Unknown",
    artist: "Unknown",
  };
}

/**
 * Scrape a batch of Atsu.moe manga pages from their sitemap.
 * @param limit - max number of titles to scrape (default 500)
 */
export async function scrapeAtsuTitles(limit = 500): Promise<MangaResult[]> {
  const urls = await getAtsuSitemapUrls();
  if (urls.length === 0) return [];

  const results: MangaResult[] = [];
  const toFetch = urls.slice(0, limit);

  // Fetch in batches of 10
  for (let i = 0; i < toFetch.length; i += 10) {
    const batch = toFetch.slice(i, i + 10);
    const htmls = await Promise.allSettled(batch.map((u) => fetchAtsu(u)));
    for (let j = 0; j < htmls.length; j++) {
      const r = htmls[j];
      if (r.status !== "fulfilled" || !r.value) continue;
      const parsed = parseAtsuMeta(r.value, batch[j]);
      if (parsed) results.push(parsed);
    }
  }

  return results;
}

/** Search Atsu.moe by checking the sitemap titles (metadata-only) */
export async function searchAtsu(query: string): Promise<MangaResult[]> {
  // Can't search directly (SPA), so rely on cached MongoDB data
  return [];
}
