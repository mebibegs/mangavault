/**
 * Manganato Scraper
 * 
 * Scrapes manga from manganato.gg
 */

import type { RawScrapedData } from "../types/manga";
import {
  BaseScraper,
  type ScraperConfig,
  type ProgressCallback,
  parseHtml,
  sleep,
} from "./base-scraper";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const config: ScraperConfig = {
  name: "Manganato",
  baseUrl: "https://www.manganato.gg",
  rateLimit: 600,
  timeout: 20000,
};

// All genres on Manganato
const GENRES = [
  "action", "adaptation", "adventure", "comedy", "demons", "drama", "ecchi",
  "fantasy", "harem", "heartwarming", "historical", "isekai", "magic",
  "manga", "manhua", "manhwa", "martial-arts", "mecha", "monsters", "mystery",
  "psychological", "reincarnation", "revenge", "romance", "school-life",
  "shoujo", "shounen", "slice-of-life", "super-power", "supernatural",
  "survival", "time-travel", "tragedy", "transmigration", "vampires",
  "villainess", "webtoons",
];

// ═══════════════════════════════════════════════════════════════════════════
// SCRAPER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export class ManganatoScraper extends BaseScraper {
  constructor() {
    super(config);
  }

  /**
   * Scrape all titles from Manganato
   */
  async scrapeAll(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
    const results = new Map<string, RawScrapedData>();

    onProgress?.({
      source: this.name,
      current: 0,
      total: GENRES.length,
      message: "Starting Manganato scrape by genre...",
    });

    // Scrape each genre
    for (let i = 0; i < GENRES.length; i++) {
      const genre = GENRES[i];
      
      onProgress?.({
        source: this.name,
        current: i,
        total: GENRES.length,
        message: `Scraping genre: ${genre}`,
      });

      const genreResults = await this.scrapeGenre(genre, 15); // 15 pages per genre

      for (const result of genreResults) {
        const key = result.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length < 3) continue;

        if (!results.has(key)) {
          results.set(key, result);
        } else {
          // Merge genres
          const existing = results.get(key)!;
          const allGenres = new Set([...(existing.genres || []), ...(result.genres || [])]);
          existing.genres = [...allGenres];
        }
      }

      await sleep(500);
    }

    onProgress?.({
      source: this.name,
      current: GENRES.length,
      total: GENRES.length,
      message: `Completed: ${results.size} titles`,
    });

    return [...results.values()];
  }

  /**
   * Scrape a specific genre with pagination
   */
  private async scrapeGenre(genre: string, maxPages: number): Promise<RawScrapedData[]> {
    const results: RawScrapedData[] = [];
    const seenUrls = new Set<string>();

    // Get first page
    const firstPageHtml = await this.fetchPage(`${this.config.baseUrl}/genre/${genre}?page=1`);
    if (!firstPageHtml) return [];

    // Parse first page
    const firstPageResults = this.parseListingPage(firstPageHtml, genre);
    for (const r of firstPageResults) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        results.push(r);
      }
    }

    // Get total pages
    const totalPages = Math.min(this.getMaxPage(firstPageHtml), maxPages);

    // Fetch remaining pages in batches of 3
    for (let start = 2; start <= totalPages; start += 3) {
      const pages = Array.from(
        { length: Math.min(3, totalPages - start + 1) },
        (_, i) => start + i
      );

      const htmls = await Promise.allSettled(
        pages.map(p => this.fetchPage(`${this.config.baseUrl}/genre/${genre}?page=${p}`))
      );

      for (const result of htmls) {
        if (result.status === "fulfilled" && result.value) {
          const pageResults = this.parseListingPage(result.value, genre);
          for (const r of pageResults) {
            if (!seenUrls.has(r.url)) {
              seenUrls.add(r.url);
              results.push(r);
            }
          }
        }
      }

      await sleep(300);
    }

    return results;
  }

  /**
   * Parse listing page
   */
  private parseListingPage(html: string, genre: string): RawScrapedData[] {
    const $ = parseHtml(html);
    const results: RawScrapedData[] = [];
    const seenUrls = new Set<string>();

    $("a[href*='/manga/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href.includes("manganato.gg/manga/") || href.includes("chapter")) return;
      if (seenUrls.has(href)) return;
      seenUrls.add(href);

      const title = $(el).attr("title") || $(el).text().trim();
      if (!title || title.length < 2 || title.length > 300) return;

      // Find cover image
      const parent = $(el).parent();
      const container = $(el).closest(".content-genres-item, .search-story-item, .item, li, div");
      const img = parent.find("img").attr("src") || 
                  container.find("img").attr("src") || 
                  $(el).find("img").attr("src") || "";

      const fullUrl = href.startsWith("http") ? href : `${this.config.baseUrl}${href}`;

      results.push({
        title,
        url: fullUrl,
        source: this.name,
        genres: [this.normalizeGenre(genre)],
        coverUrl: img,
        type: "manhwa",
        status: "ongoing",
      });
    });

    return results;
  }

  /**
   * Get max page number from HTML
   */
  private getMaxPage(html: string): number {
    let max = 1;
    for (const m of html.matchAll(/page=(\d+)/g)) {
      const p = parseInt(m[1], 10);
      if (p > max) max = p;
    }
    return max;
  }

  /**
   * Normalize genre slug to display name
   */
  private normalizeGenre(slug: string): string {
    const map: Record<string, string> = {
      "action": "Action",
      "adaptation": "Adaptation",
      "adventure": "Adventure",
      "comedy": "Comedy",
      "demons": "Demons",
      "drama": "Drama",
      "ecchi": "Ecchi",
      "fantasy": "Fantasy",
      "harem": "Harem",
      "heartwarming": "Heartwarming",
      "historical": "Historical",
      "isekai": "Isekai",
      "magic": "Magic",
      "manga": "Manga",
      "manhua": "Manhua",
      "manhwa": "Manhwa",
      "martial-arts": "Martial Arts",
      "mecha": "Mecha",
      "monsters": "Monsters",
      "mystery": "Mystery",
      "psychological": "Psychological",
      "reincarnation": "Reincarnation",
      "revenge": "Revenge",
      "romance": "Romance",
      "school-life": "School Life",
      "shoujo": "Shoujo",
      "shounen": "Shounen",
      "slice-of-life": "Slice of Life",
      "super-power": "Super Power",
      "supernatural": "Supernatural",
      "survival": "Survival",
      "time-travel": "Time Travel",
      "tragedy": "Tragedy",
      "transmigration": "Transmigration",
      "vampires": "Vampires",
      "villainess": "Villainess",
      "webtoons": "Webtoons",
    };
    return map[slug] || slug;
  }

  /**
   * Get full details for a manga URL
   */
  async getDetails(url: string): Promise<RawScrapedData | null> {
    const html = await this.fetchPage(url);
    if (!html) return null;

    return this.parseDetailPage(html, url);
  }

  /**
   * Parse detail page
   */
  private parseDetailPage(html: string, url: string): RawScrapedData | null {
    const $ = parseHtml(html);

    const title = $("h1").first().text().trim() ||
                  $(".story-info-right h1").text().trim() ||
                  $("title").text().replace(/ - Manganato.*$/i, "").trim();

    if (!title) return null;

    // Get description
    let description = "";
    const descEl = $(".panel-story-info-description, #panel-story-info-description");
    if (descEl.length) {
      description = descEl.text().replace(/Description\s*:?\s*/i, "").trim();
    }

    // Get cover image
    const coverUrl = $(".story-info-left img, .info-image img").attr("src") || "";

    // Get status
    let status = "ongoing";
    const statusText = $("td:contains('Status') + td, .info-status").text().toLowerCase();
    if (statusText.includes("completed")) status = "completed";
    else if (statusText.includes("hiatus")) status = "hiatus";

    // Get genres
    const genres: string[] = [];
    $("td:contains('Genres') + td a, .info-genres a").each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    // Get authors
    const authors: string[] = [];
    $("td:contains('Author') + td a, .info-author a").each((_, el) => {
      const a = $(el).text().trim();
      if (a) authors.push(a);
    });

    // Get chapters
    const chapters: Array<{ number?: string; title: string; url: string; date?: string }> = [];
    $(".chapter-name, .row-content-chapter a").each((_, el) => {
      const chapterUrl = $(el).attr("href") || "";
      const chapterTitle = $(el).text().trim();
      const dateEl = $(el).closest("li, tr").find(".chapter-time, time");
      const date = dateEl.text().trim();

      if (chapterUrl && chapterTitle) {
        chapters.push({
          number: this.extractChapterNumber(chapterTitle),
          title: chapterTitle,
          url: chapterUrl,
          date,
        });
      }
    });

    // Determine type
    let type = "manhwa";
    const bodyText = $("body").text().toLowerCase();
    if (bodyText.includes("manhua") || genres.some(g => g.toLowerCase() === "manhua")) {
      type = "manhua";
    } else if (bodyText.includes("manga") || genres.some(g => g.toLowerCase() === "manga")) {
      type = "manga";
    }

    return {
      title,
      url,
      source: this.name,
      description,
      authors,
      status,
      type,
      genres,
      chapters,
      coverUrl,
    };
  }

  /**
   * Extract chapter number
   */
  private extractChapterNumber(title: string): string | undefined {
    const match = title.match(/(?:chapter|ch\.?)\s*([\d.]+)/i);
    return match ? match[1] : undefined;
  }

  /**
   * Search Manganato
   */
  async search(query: string): Promise<RawScrapedData[]> {
    // Manganato search uses underscore-separated words
    const searchQuery = query.replace(/\s+/g, "_");
    const url = `${this.config.baseUrl}/search/${searchQuery}`;
    const html = await this.fetchPage(url);

    if (!html) return [];

    const results: RawScrapedData[] = [];
    const $ = parseHtml(html);

    $(".search-story-item").each((_, el) => {
      const linkEl = $(el).find("a.item-title, a.item-img");
      const href = linkEl.attr("href") || "";
      const title = $(el).find("h3, .item-title").text().trim();
      const img = $(el).find("img").attr("src") || "";

      if (href && title) {
        results.push({
          title,
          url: href,
          source: this.name,
          coverUrl: img,
          type: "manhwa",
        });
      }
    });

    return results;
  }
}

// Export singleton instance
export const manganatoScraper = new ManganatoScraper();

/**
 * Scrape all Manganato titles
 */
export async function scrapeManganato(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
  return manganatoScraper.scrapeAll(onProgress);
}
