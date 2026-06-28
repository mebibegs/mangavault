/**
 * Omega Scans Scraper
 * 
 * Scrapes manga/manhwa from omegascans.org using their JSON API
 */

import type { RawScrapedData } from "../types/manga";
import {
  BaseScraper,
  type ScraperConfig,
  type ProgressCallback,
  fetchJsonWithRetry,
  sleep,
} from "./base-scraper";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface OmegaSeries {
  id: number;
  title: string;
  series_slug: string;
  description: string;
  thumbnail: string;
  rating: number;
  status: string;
  alternative_names: string;
  author: string;
  artist: string;
  release_year: number;
  type: string;
  tags: Array<{ id: number; name: string }>;
  meta: {
    chapters_count: string;
    views: string;
    bookmarks: string;
  };
}

interface OmegaChapter {
  id: number;
  chapter_name: string;
  chapter_slug: string;
  created_at: string;
  price: number;
}

interface OmegaResponse {
  data: OmegaSeries[];
  meta: {
    total: number;
    last_page: number;
    per_page: number;
    current_page: number;
  };
}

interface OmegaSeriesDetail {
  id: number;
  title: string;
  series_slug: string;
  description: string;
  thumbnail: string;
  cover: string;
  rating: number;
  status: string;
  alternative_names: string;
  author: string;
  artist: string;
  release_year: number;
  type: string;
  tags: Array<{ id: number; name: string }>;
  chapters: OmegaChapter[];
  meta: {
    chapters_count: string;
    views: string;
    bookmarks: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRAPER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

const config: ScraperConfig = {
  name: "Omega Scans",
  baseUrl: "https://omegascans.org",
  rateLimit: 500, // 500ms between requests
  timeout: 20000,
};

export class OmegaScraper extends BaseScraper {
  constructor() {
    super(config);
  }

  /**
   * Scrape all titles from Omega Scans
   */
  async scrapeAll(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
    const results: RawScrapedData[] = [];
    const seenSlugs = new Set<string>();

    // Get first page to know total pages
    const firstPage = await this.fetchSeriesList(1);
    if (!firstPage) {
      console.error("Failed to fetch Omega Scans first page");
      return [];
    }

    const totalPages = firstPage.meta.last_page;
    const totalItems = firstPage.meta.total;

    onProgress?.({
      source: this.name,
      current: 0,
      total: totalItems,
      message: `Starting scrape of ${totalItems} titles across ${totalPages} pages`,
    });

    // Process first page
    for (const series of firstPage.data) {
      if (seenSlugs.has(series.series_slug)) continue;
      seenSlugs.add(series.series_slug);

      const detail = await this.fetchSeriesDetail(series.series_slug);
      if (detail) {
        results.push(this.transformSeries(detail));
      }

      onProgress?.({
        source: this.name,
        current: results.length,
        total: totalItems,
        message: `Scraped: ${series.title}`,
      });
    }

    // Process remaining pages
    for (let page = 2; page <= totalPages; page++) {
      const pageData = await this.fetchSeriesList(page);
      if (!pageData) continue;

      for (const series of pageData.data) {
        if (seenSlugs.has(series.series_slug)) continue;
        seenSlugs.add(series.series_slug);

        const detail = await this.fetchSeriesDetail(series.series_slug);
        if (detail) {
          results.push(this.transformSeries(detail));
        }

        onProgress?.({
          source: this.name,
          current: results.length,
          total: totalItems,
          message: `Page ${page}/${totalPages}: ${series.title}`,
        });
      }

      // Small delay between pages
      await sleep(300);
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
   * Fetch series list page
   */
  private async fetchSeriesList(page: number): Promise<OmegaResponse | null> {
    const url = `${this.config.baseUrl}/api/query?page=${page}&perPage=30&series_type=Comic&query_string=`;
    return this.fetchJson<OmegaResponse>(url);
  }

  /**
   * Fetch series detail with chapters
   */
  private async fetchSeriesDetail(slug: string): Promise<OmegaSeriesDetail | null> {
    const url = `${this.config.baseUrl}/api/series/${slug}`;
    return this.fetchJson<OmegaSeriesDetail>(url);
  }

  /**
   * Transform Omega series data to RawScrapedData
   */
  private transformSeries(series: OmegaSeriesDetail): RawScrapedData {
    // Parse alternative names
    const altTitles: string[] = [];
    if (series.alternative_names) {
      const alts = series.alternative_names.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      altTitles.push(...alts);
    }

    // Parse authors/artists
    const authors: string[] = [];
    const artists: string[] = [];
    if (series.author) {
      authors.push(...series.author.split(/[,;|]/).map(s => s.trim()).filter(Boolean));
    }
    if (series.artist) {
      artists.push(...series.artist.split(/[,;|]/).map(s => s.trim()).filter(Boolean));
    }

    // Get genres from tags
    const genres = (series.tags || []).map(t => t.name).filter(Boolean);

    // Transform chapters
    const chapters = (series.chapters || []).map(ch => ({
      number: this.extractChapterNumber(ch.chapter_name),
      title: ch.chapter_name,
      url: `${this.config.baseUrl}/series/${series.series_slug}/${ch.chapter_slug}`,
      date: ch.created_at,
    }));

    // Determine type
    let type = "manhwa";
    if (series.type) {
      const t = series.type.toLowerCase();
      if (t.includes("manga")) type = "manga";
      else if (t.includes("manhua")) type = "manhua";
    }

    return {
      title: series.title,
      url: `${this.config.baseUrl}/series/${series.series_slug}`,
      source: this.name,
      altTitles,
      description: series.description,
      authors,
      artists,
      releaseYear: series.release_year || undefined,
      status: this.normalizeStatus(series.status),
      type,
      genres,
      chapters,
      coverUrl: series.cover || series.thumbnail,
      rating: series.rating,
      views: parseInt(series.meta?.views || "0", 10) || undefined,
      bookmarks: parseInt(series.meta?.bookmarks || "0", 10) || undefined,
      sourceId: String(series.id),
    };
  }

  /**
   * Extract chapter number from chapter name
   */
  private extractChapterNumber(name: string): string | undefined {
    const match = name.match(/(?:chapter|ch\.?|episode|ep\.?)\s*([\d.]+)/i);
    if (match) return match[1];
    
    const numMatch = name.match(/^([\d.]+)/);
    if (numMatch) return numMatch[1];
    
    return undefined;
  }

  /**
   * Normalize status
   */
  private normalizeStatus(status: string): string {
    const s = status?.toLowerCase() || "";
    if (s.includes("ongoing") || s.includes("releasing")) return "ongoing";
    if (s.includes("completed") || s.includes("finished")) return "completed";
    if (s.includes("hiatus")) return "hiatus";
    if (s.includes("cancelled") || s.includes("dropped")) return "cancelled";
    return "unknown";
  }

  /**
   * Search Omega Scans
   */
  async search(query: string): Promise<RawScrapedData[]> {
    const url = `${this.config.baseUrl}/api/query?page=1&perPage=30&series_type=Comic&query_string=${encodeURIComponent(query)}`;
    const response = await this.fetchJson<OmegaResponse>(url);
    
    if (!response) return [];

    const results: RawScrapedData[] = [];
    for (const series of response.data) {
      const detail = await this.fetchSeriesDetail(series.series_slug);
      if (detail) {
        results.push(this.transformSeries(detail));
      }
    }

    return results;
  }
}

// Export singleton instance
export const omegaScraper = new OmegaScraper();

/**
 * Scrape all Omega Scans titles
 */
export async function scrapeOmegaScans(onProgress?: ProgressCallback): Promise<RawScrapedData[]> {
  return omegaScraper.scrapeAll(onProgress);
}
