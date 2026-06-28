/**
 * Webtoons Scraper
 * 
 * Scrapes webtoons from webtoons.com
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
  name: "Webtoons",
  baseUrl: "https://www.webtoons.com",
  rateLimit: 1000, // Webtoons is stricter
  timeout: 25000,
};

// Webtoon genres
const GENRES = [
  { slug: "drama", name: "Drama" },
  { slug: "fantasy", name: "Fantasy" },
  { slug: "comedy", name: "Comedy" },
  { slug: "action", name: "Action" },
  { slug: "slice-of-life", name: "Slice of Life" },
  { slug: "romance", name: "Romance" },
  { slug: "supernatural", name: "Supernatural" },
  { slug: "thriller", name: "Thriller" },
  { slug: "sci-fi", name: "Science Fiction" },
  { slug: "horror", name: "Horror" },
  { slug: "sports", name: "Sports" },
  { slug: "historical", name: "Historical" },
  { slug: "heartwarming", name: "Heartwarming" },
  { slug: "informative", name: "Informative" },
];

// ═══════════════════════════════════════════════════════════════════════════
// SCRAPER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export class WebtoonScraper extends BaseScraper {
  constructor() {
    super(config);
  }

  /**
   * Get cookies for mature content
   */
  private getCookies(): string {
    const now = Date.now();
    return [
      `ageGateV2=${now}`,
      `needGDPR=N`,
      `needCCPA=N`,
      `needCOPPA=N`,
      `pagGDPR=true`,
      `contentRating=adult`,
      `locale=en`,
      `country=US`,
      `timezoneOffset=-300`,
    ].join("; ");
  }

  /**
   * Fetch page with Webtoon-specific headers
   */
  protected async fetchWebtoonPage(url: string): Promise<string | null> {
    return this.fetchPage(url, {
      cookies: this.getCookies(),
      headers: {
        Referer: "https://www.webtoons.com/",
        "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });
  }

  /**
   * Scrape all titles from Webtoons
   */
  async scrapeAll(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
    const results = new Map<string, RawScrapedData>();

    onProgress?.({
      source: this.name,
      current: 0,
      total: GENRES.length,
      message: "Starting Webtoons scrape...",
    });

    // Scrape each genre
    for (let i = 0; i < GENRES.length; i++) {
      const genre = GENRES[i];

      onProgress?.({
        source: this.name,
        current: i,
        total: GENRES.length,
        message: `Scraping genre: ${genre.name}`,
      });

      const genreResults = await this.scrapeGenre(genre.slug, genre.name);

      for (const result of genreResults) {
        const key = result.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key.length < 3) continue;

        if (!results.has(key)) {
          results.set(key, result);
        } else {
          const existing = results.get(key)!;
          const allGenres = new Set([...(existing.genres || []), ...(result.genres || [])]);
          existing.genres = [...allGenres];
        }
      }

      await sleep(800);
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
   * Scrape a specific genre
   */
  private async scrapeGenre(slug: string, genreName: string): Promise<RawScrapedData[]> {
    const results: RawScrapedData[] = [];
    const seenUrls = new Set<string>();

    // Webtoons genre URL
    const url = `${this.config.baseUrl}/en/genre?genre=${slug}`;
    const html = await this.fetchWebtoonPage(url);

    if (!html) return [];

    const $ = parseHtml(html);

    // Parse cards
    $("a[href*='/en/'][href*='/list']").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href || seenUrls.has(href)) return;

      // Extract title
      const title = $(el).find(".subj").text().trim() ||
                    $(el).find(".info p").first().text().trim() ||
                    $(el).attr("title") || "";

      if (!title || title.length < 2) return;

      seenUrls.add(href);

      // Find cover image
      const img = $(el).find("img").attr("src") ||
                  $(el).find("img").attr("data-src") || "";

      // Get author
      const author = $(el).find(".author").text().trim() || "";

      const fullUrl = href.startsWith("http") ? href : `${this.config.baseUrl}${href}`;

      results.push({
        title,
        url: fullUrl,
        source: this.name,
        genres: [genreName],
        coverUrl: img,
        authors: author ? [author] : [],
        type: "manhwa", // Webtoons are Korean
        status: "ongoing",
      });
    });

    return results;
  }

  /**
   * Get full details for a webtoon
   */
  async getDetails(url: string): Promise<RawScrapedData | null> {
    const html = await this.fetchWebtoonPage(url);
    if (!html) return null;

    return this.parseDetailPage(html, url);
  }

  /**
   * Parse detail page
   */
  private parseDetailPage(html: string, url: string): RawScrapedData | null {
    const $ = parseHtml(html);

    const title = $("h1.subj").text().trim() ||
                  $(".info h1").text().trim() ||
                  $("title").text().replace(/\\s*\\|.*$/, "").trim();

    if (!title) return null;

    // Get description
    const description = $(".summary, .synopsis, p.summary").text().trim() ||
                       $('meta[property="og:description"]').attr("content") || "";

    // Get cover
    const coverUrl = $(".detail_body .thmb img").attr("src") ||
                    $('meta[property="og:image"]').attr("content") || "";

    // Get author
    const author = $(".author_area a, .info .author").text().trim() || "";

    // Get genres
    const genres: string[] = [];
    $(".genre, .tag").each((_, el) => {
      const g = $(el).text().trim();
      if (g) genres.push(g);
    });

    // Get rating
    let rating: number | undefined;
    const ratingText = $(".grade_num, #_starScoreAverage").text().trim();
    if (ratingText) {
      const parsed = parseFloat(ratingText);
      if (!isNaN(parsed)) rating = parsed;
    }

    // Get chapters
    const chapters: Array<{ number?: string; title: string; url: string; date?: string }> = [];
    $("ul#_listUl li a, .episode_lst li a").each((_, el) => {
      const chapterUrl = $(el).attr("href") || "";
      const chapterTitle = $(el).find(".subj span").text().trim() ||
                          $(el).find(".episode_title").text().trim() ||
                          $(el).text().trim();
      const date = $(el).find(".date").text().trim();

      if (chapterUrl && chapterTitle) {
        const fullUrl = chapterUrl.startsWith("http") ? chapterUrl : `${this.config.baseUrl}${chapterUrl}`;
        
        // Extract episode number from URL
        const epMatch = chapterUrl.match(/episode_no=(\d+)/);
        const number = epMatch ? epMatch[1] : undefined;

        chapters.push({
          number,
          title: chapterTitle,
          url: fullUrl,
          date,
        });
      }
    });

    return {
      title,
      url,
      source: this.name,
      description,
      authors: author ? [author] : [],
      genres,
      chapters,
      coverUrl,
      rating,
      type: "manhwa",
      country: "Korea",
    };
  }

  /**
   * Search Webtoons
   */
  async search(query: string): Promise<RawScrapedData[]> {
    const url = `${this.config.baseUrl}/en/search?keyword=${encodeURIComponent(query)}`;
    const html = await this.fetchWebtoonPage(url);

    if (!html) return [];

    const results: RawScrapedData[] = [];
    const $ = parseHtml(html);

    $(".card_lst li a, .search_result li a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).find(".subj").text().trim() ||
                    $(el).find("p.title").text().trim() || "";
      const img = $(el).find("img").attr("src") || "";
      const author = $(el).find(".author").text().trim() || "";

      if (href && title) {
        const fullUrl = href.startsWith("http") ? href : `${this.config.baseUrl}${href}`;
        results.push({
          title,
          url: fullUrl,
          source: this.name,
          coverUrl: img,
          authors: author ? [author] : [],
          type: "manhwa",
        });
      }
    });

    return results;
  }
}

// Export singleton instance
export const webtoonScraper = new WebtoonScraper();

/**
 * Scrape all Webtoon titles
 */
export async function scrapeWebtoons(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
  return webtoonScraper.scrapeAll(onProgress);
}
