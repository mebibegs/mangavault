/**
 * Base Scraper Infrastructure
 * 
 * Provides common utilities and interfaces for all scrapers
 */

import * as cheerio from "cheerio";
import type { RawScrapedData } from "../types/manga";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_TIMEOUT = 20000; // 20 seconds
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_RETRY_DELAY = 2000; // 2 seconds

export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

export const DEFAULT_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  cookies?: string;
  retries?: number;
  retryDelay?: number;
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  rateLimit?: number; // ms between requests
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ScrapeProgress {
  source: string;
  current: number;
  total: number;
  message: string;
}

export type ProgressCallback = (progress: ScrapeProgress) => void;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a random user agent
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout, retries, and error handling
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<string | null> {
  const {
    timeout = DEFAULT_TIMEOUT,
    headers = {},
    cookies,
    retries = DEFAULT_RETRY_COUNT,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestHeaders: Record<string, string> = {
        ...DEFAULT_HEADERS,
        "User-Agent": getRandomUserAgent(),
        ...headers,
      };

      if (cookies) {
        requestHeaders.Cookie = cookies;
      }

      const response = await fetch(url, {
        headers: requestHeaders,
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait longer
          await sleep(retryDelay * 3);
          continue;
        }
        if (response.status >= 500 && attempt < retries) {
          await sleep(retryDelay);
          continue;
        }
        return null;
      }

      return await response.text();
    } catch (error) {
      if (attempt < retries) {
        await sleep(retryDelay * attempt);
        continue;
      }
      console.error(`Fetch failed for ${url}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Fetch JSON with retry
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T | null> {
  const {
    timeout = DEFAULT_TIMEOUT,
    headers = {},
    retries = DEFAULT_RETRY_COUNT,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestHeaders: Record<string, string> = {
        ...DEFAULT_HEADERS,
        Accept: "application/json",
        "User-Agent": getRandomUserAgent(),
        ...headers,
      };

      const response = await fetch(url, {
        headers: requestHeaders,
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (attempt < retries) {
          await sleep(retryDelay);
          continue;
        }
        return null;
      }

      return await response.json() as T;
    } catch (error) {
      if (attempt < retries) {
        await sleep(retryDelay * attempt);
        continue;
      }
      console.error(`JSON fetch failed for ${url}:`, error);
      return null;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML PARSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export type CheerioAPI = cheerio.CheerioAPI;

/**
 * Load HTML into Cheerio
 */
export function parseHtml(html: string): CheerioAPI {
  return cheerio.load(html);
}

/**
 * Extract text content, cleaned
 */
export function extractText($: CheerioAPI, selector: string): string {
  return $(selector).text().replace(/\s+/g, " ").trim();
}

/**
 * Extract attribute value
 */
export function extractAttr(
  $: CheerioAPI,
  selector: string,
  attr: string
): string | null {
  const value = $(selector).attr(attr);
  return value?.trim() || null;
}

/**
 * Extract and clean image URL
 */
export function extractImageUrl(
  $: CheerioAPI,
  selector: string,
  baseUrl?: string
): string | null {
  const $el = $(selector);
  
  // Try various image attributes
  const src = 
    $el.attr("src") ||
    $el.attr("data-src") ||
    $el.attr("data-lazy-src") ||
    $el.attr("data-original") ||
    $el.attr("content");

  if (!src) return null;

  let url = src.trim();

  // Convert relative to absolute URL
  if (baseUrl && !url.startsWith("http")) {
    if (url.startsWith("//")) {
      url = "https:" + url;
    } else if (url.startsWith("/")) {
      url = new URL(url, baseUrl).toString();
    } else {
      url = new URL(url, baseUrl).toString();
    }
  }

  return url;
}

/**
 * Parse date from various formats
 */
export function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim();
  if (!cleaned) return null;
  
  return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════
// ABSTRACT BASE SCRAPER
// ═══════════════════════════════════════════════════════════════════════════

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected lastRequestTime: number = 0;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  /**
   * Get the scraper name
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * Apply rate limiting
   */
  protected async rateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const waitTime = this.config.rateLimit - elapsed;

    if (waitTime > 0) {
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch a page with rate limiting
   */
  protected async fetchPage(url: string, options: FetchOptions = {}): Promise<string | null> {
    await this.rateLimit();
    return fetchWithRetry(url, {
      timeout: this.config.timeout,
      headers: this.config.headers,
      ...options,
    });
  }

  /**
   * Fetch JSON with rate limiting
   */
  protected async fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T | null> {
    await this.rateLimit();
    return fetchJsonWithRetry<T>(url, {
      timeout: this.config.timeout,
      headers: this.config.headers,
      ...options,
    });
  }

  /**
   * Scrape all titles from this source
   * Must be implemented by each scraper
   */
  abstract scrapeAll(onProgress?: ProgressCallback): Promise<RawScrapedData[]>;

  /**
   * Search for titles on this source
   * Can be overridden if the source supports search
   */
  async search(query: string): Promise<RawScrapedData[]> {
    console.warn(`Search not implemented for ${this.name}`);
    return [];
  }

  /**
   * Get details for a specific title
   * Can be overridden for more detailed scraping
   */
  async getDetails(url: string): Promise<RawScrapedData | null> {
    console.warn(`getDetails not implemented for ${this.name}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process items in batches with concurrency control
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const {
    batchSize = 5,
    delayBetweenBatches = 1000,
    onProgress,
  } = options;

  const results: R[] = [];
  let completed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((item, idx) => processor(item, i + idx))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
      completed++;
    }

    if (onProgress) {
      onProgress(completed, items.length);
    }

    if (i + batchSize < items.length) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}
