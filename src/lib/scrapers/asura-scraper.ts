/**
 * Asura Scans Scraper
 * 
 * Scrapes manga/manhwa from asurascans.com
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
  name: "Asura Scans",
  baseUrl: "https://asurascans.com",
  rateLimit: 800, // 800ms between requests
  timeout: 20000,
};

// ═══════════════════════════════════════════════════════════════════════════
// SCRAPER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export class AsuraScraper extends BaseScraper {
  constructor() {
    super(config);
  }

  /**
   * Scrape all titles from Asura Scans
   */
  async scrapeAll(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
    const results: RawScrapedData[] = [];
    const seenUrls = new Set<string>();
    let page = 1;
    let hasMore = true;

    onProgress?.({
      source: this.name,
      current: 0,
      total: 0,
      message: "Starting Asura Scans scrape...",
    });

    while (hasMore) {
      const pageUrl = `${this.config.baseUrl}/browse?page=${page}&sort=update`;
      const html = await this.fetchPage(pageUrl);

      if (!html) {
        hasMore = false;
        break;
      }

      const links = this.parseListingPage(html);
      
      if (links.length === 0) {
        hasMore = false;
        break;
      }

      // Fetch details for each link
      for (const link of links) {
        if (seenUrls.has(link.href)) continue;
        seenUrls.add(link.href);

        const detailHtml = await this.fetchPage(link.href);
        if (detailHtml) {
          const data = this.parseDetailPage(detailHtml, link.href);
          if (data) {
            results.push(data);
            onProgress?.({
              source: this.name,
              current: results.length,
              total: 0,
              message: `Page ${page}: ${data.title}`,
            });
          }
        }
      }

      page++;
      await sleep(500);

      // Safety limit
      if (page > 100) {
        hasMore = false;
      }
    }

    onProgress?.({
      source: this.name,
      current: results.length,
      total: results.length,
      message: `Completed: ${results.length} titles`,
    });

    return results;
  }

  /**
   * Parse listing page for comic links
   */
  private parseListingPage(html: string): Array<{ title: string; href: string }> {
    const $ = parseHtml(html);
    const links: Array<{ title: string; href: string }> = [];

    $("a[href*='/comics/']").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).find("h3").text().trim() || $(el).text().trim();

      if (href && title && title.length > 0 && !links.find(l => l.href === href)) {
        const fullHref = href.startsWith("http") ? href : `${this.config.baseUrl}${href}`;
        links.push({ title, href: fullHref });
      }
    });

    return links;
  }

  /**
   * Parse detail page for manga data
   */
  private parseDetailPage(html: string, url: string): RawScrapedData | null {
    try {
      const $ = parseHtml(html);
      
      // Try to get title from page title
      let title = $("title").text().trim().replace(/\s*[\|–—-]\s*Asura\s*Scans?.*/i, "").trim();
      
      let description = "";
      let rating: number | undefined;
      let status = "ongoing";
      let type = "manhwa";
      let author = "";
      let artist = "";
      let coverUrl = "";
      let chapterCount = 0;
      const genres: string[] = [];
      const chapters: Array<{ number?: string; title: string; url: string; date?: string }> = [];

      // Parse Astro island props (Asura uses Astro framework)
      $("astro-island").each((_, el) => {
        const props = $(el).attr("props");
        if (!props || !props.includes('"description"')) return;

        try {
          const extractProp = (name: string): string | null => {
            const regex = new RegExp(`"${name}":\\[0,"([^"]+)"\\]`);
            const match = props.match(regex);
            return match ? match[1] : null;
          };

          if (!title) title = extractProp("title") || "";
          
          const ratingMatch = props.match(/"rating":\[0,([\d.]+)\]/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1]);

          status = extractProp("status") || status;
          type = extractProp("type") || type;
          author = extractProp("author") || author;
          artist = extractProp("artist") || artist;
          coverUrl = extractProp("coverUrl") || coverUrl;

          const ccMatch = props.match(/"chapterCount":\[0,(\d+)\]/);
          if (ccMatch) chapterCount = parseInt(ccMatch[1], 10);

          // Extract genres
          const excludeGenres = new Set(["home", "bookmarks", "browse", "search", "login", "register", "latest", "popular"]);
          for (const gm of props.matchAll(/"name":\[0,"([^"]+)"\]/g)) {
            if (!genres.includes(gm[1]) && !excludeGenres.has(gm[1].toLowerCase())) {
              genres.push(gm[1]);
            }
          }

          // Extract description
          const descMatch = props.match(/"description":\[0,"<p>([\s\S]*?)<\/p>"\]/);
          if (descMatch) {
            description = descMatch[1]
              .replace(/\\"/g, '"')
              .replace(/&nbsp;|&#160;/g, " ")
              .trim();
          }
        } catch {
          // Ignore parsing errors
        }
      });

      // Fallback description
      if (!description) {
        const descEl = $("div p").first();
        if (descEl.length) {
          description = descEl.text().trim().substring(0, 1000);
        }
      }

      // Parse chapters
      $("a[href*='/chapter/'], a[href*='/chapter-']").each((_, el) => {
        const chapterUrl = $(el).attr("href") || "";
        if (!chapterUrl) return;

        const spans = $(el).find("span");
        let chapterTitle = "";
        let chapterDate = "";

        if (spans.length >= 2) {
          chapterTitle = $(spans[0]).text().replace(/\s+/g, " ").trim();
          chapterDate = $(spans[spans.length - 1]).text().replace(/\s+/g, " ").trim();
        } else {
          chapterTitle = $(el).text().replace(/\s+/g, " ").trim();
        }

        if (chapterTitle) {
          const fullUrl = chapterUrl.startsWith("http") ? chapterUrl : `${this.config.baseUrl}${chapterUrl}`;
          chapters.push({
            number: this.extractChapterNumber(chapterTitle),
            title: chapterTitle,
            url: fullUrl,
            date: chapterDate,
          });
        }
      });

      if (!title) return null;

      // Parse authors/artists
      const authors: string[] = [];
      const artists: string[] = [];
      if (author) authors.push(...author.split(/[,;|]/).map(s => s.trim()).filter(Boolean));
      if (artist) artists.push(...artist.split(/[,;|]/).map(s => s.trim()).filter(Boolean));

      return {
        title,
        url,
        source: this.name,
        description,
        authors,
        artists,
        status: this.normalizeStatus(status),
        type: this.normalizeType(type),
        genres,
        chapters,
        coverUrl,
        rating,
      };
    } catch (err) {
      console.error("Failed to parse Asura detail page:", err);
      return null;
    }
  }

  /**
   * Extract chapter number from title
   */
  private extractChapterNumber(title: string): string | undefined {
    const match = title.match(/(?:chapter|ch\.?|episode|ep\.?)\s*([\d.]+)/i);
    return match ? match[1] : undefined;
  }

  /**
   * Normalize status
   */
  private normalizeStatus(status: string): string {
    const s = status?.toLowerCase() || "";
    if (s.includes("ongoing")) return "ongoing";
    if (s.includes("completed") || s.includes("finished")) return "completed";
    if (s.includes("hiatus")) return "hiatus";
    if (s.includes("cancelled") || s.includes("dropped")) return "cancelled";
    return "unknown";
  }

  /**
   * Normalize type
   */
  private normalizeType(type: string): string {
    const t = type?.toLowerCase() || "";
    if (t.includes("manga")) return "manga";
    if (t.includes("manhua")) return "manhua";
    if (t.includes("manhwa")) return "manhwa";
    return "manhwa";
  }

  /**
   * Search Asura Scans
   */
  async search(query: string): Promise<RawScrapedData[]> {
    const url = `${this.config.baseUrl}/browse?q=${encodeURIComponent(query)}`;
    const html = await this.fetchPage(url);

    if (!html) return [];

    const links = this.parseListingPage(html);
    const results: RawScrapedData[] = [];

    for (const link of links.slice(0, 10)) { // Limit search results
      const detailHtml = await this.fetchPage(link.href);
      if (detailHtml) {
        const data = this.parseDetailPage(detailHtml, link.href);
        if (data) results.push(data);
      }
    }

    return results;
  }
}

// Export singleton instance
export const asuraScraper = new AsuraScraper();

/**
 * Scrape all Asura Scans titles
 */
export async function scrapeAsuraScans(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
  return asuraScraper.scrapeAll(onProgress);
}
