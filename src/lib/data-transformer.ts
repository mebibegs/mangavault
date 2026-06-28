/**
 * Data Transformer
 * 
 * Transforms raw scraped data into normalized MangaDocument format
 */

import type {
  MangaDocument,
  RawScrapedData,
  ChapterData,
  SourceLink,
  ImageData,
  StatsData,
  ContentClassification,
  SearchData,
} from "./types/manga";
import { cleanDescription, isValidDescription } from "./description-cleaner";
import {
  normalizeGenres,
  getRestrictedIdentifiers,
  isRestrictedContent,
  getContentRating,
} from "./genre-normalizer";
import {
  generateSlug,
  generateTitleKey,
  generateSearchKeywords,
  generateAbbreviations,
} from "./slug-generator";

// ═══════════════════════════════════════════════════════════════════════════
// STATUS NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_MAP: Record<string, MangaDocument["status"]> = {
  "ongoing": "ongoing",
  "on going": "ongoing",
  "on-going": "ongoing",
  "releasing": "ongoing",
  "publishing": "ongoing",
  "active": "ongoing",
  
  "completed": "completed",
  "complete": "completed",
  "finished": "completed",
  "ended": "completed",
  
  "hiatus": "hiatus",
  "on hiatus": "hiatus",
  "paused": "hiatus",
  "discontinued": "hiatus",
  
  "cancelled": "cancelled",
  "canceled": "cancelled",
  "dropped": "cancelled",
  "axed": "cancelled",
  
  "unknown": "unknown",
  "n/a": "unknown",
  "tba": "unknown",
  "tbd": "unknown",
};

function normalizeStatus(status?: string): MangaDocument["status"] {
  if (!status) return "unknown";
  const key = status.toLowerCase().trim();
  return STATUS_MAP[key] || "unknown";
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_MAP: Record<string, MangaDocument["type"]> = {
  "manga": "manga",
  "japanese manga": "manga",
  "jp": "manga",
  
  "manhwa": "manhwa",
  "korean manhwa": "manhwa",
  "kr": "manhwa",
  "korean": "manhwa",
  "webtoon": "manhwa",
  
  "manhua": "manhua",
  "chinese manhua": "manhua",
  "cn": "manhua",
  "chinese": "manhua",
  
  "novel": "novel",
  "light novel": "novel",
  "ln": "novel",
  "web novel": "novel",
  "wn": "novel",
  
  "oneshot": "oneshot",
  "one shot": "oneshot",
  "one-shot": "oneshot",
  
  "doujinshi": "doujinshi",
  "doujin": "doujinshi",
};

function normalizeType(type?: string): MangaDocument["type"] {
  if (!type) return "unknown";
  const key = type.toLowerCase().trim();
  return TYPE_MAP[key] || "unknown";
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════

function parseChapterNumber(text?: string): string | null {
  if (!text) return null;
  
  // Try to extract number from chapter text
  const patterns = [
    /chapter\s*([\d.]+)/i,
    /chap(?:ter)?\.?\s*([\d.]+)/i,
    /ch\.?\s*([\d.]+)/i,
    /episode\s*([\d.]+)/i,
    /ep\.?\s*([\d.]+)/i,
    /^\s*([\d.]+)\s*$/,
    /\b([\d.]+)\b/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim();
  
  // Try ISO format first
  const isoDate = new Date(cleaned);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Try relative dates
  const relativePatterns: [RegExp, (n: number) => Date][] = [
    [/(\d+)\s*(?:second|sec|s)\s*ago/i, (n) => new Date(Date.now() - n * 1000)],
    [/(\d+)\s*(?:minute|min|m)\s*ago/i, (n) => new Date(Date.now() - n * 60 * 1000)],
    [/(\d+)\s*(?:hour|hr|h)\s*ago/i, (n) => new Date(Date.now() - n * 60 * 60 * 1000)],
    [/(\d+)\s*(?:day|d)\s*ago/i, (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)],
    [/(\d+)\s*(?:week|w)\s*ago/i, (n) => new Date(Date.now() - n * 7 * 24 * 60 * 60 * 1000)],
    [/(\d+)\s*(?:month|mo)\s*ago/i, (n) => new Date(Date.now() - n * 30 * 24 * 60 * 60 * 1000)],
    [/(\d+)\s*(?:year|yr|y)\s*ago/i, (n) => new Date(Date.now() - n * 365 * 24 * 60 * 60 * 1000)],
  ];
  
  for (const [pattern, calc] of relativePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return calc(parseInt(match[1], 10));
    }
  }
  
  // Try other date formats
  const dateFormats = [
    /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/,  // MM/DD/YYYY
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,  // Month DD, YYYY
  ];
  
  for (const format of dateFormats) {
    const match = cleaned.match(format);
    if (match) {
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  
  return null;
}

function transformChapters(
  rawChapters: RawScrapedData["chapters"],
  source: string
): ChapterData[] {
  if (!rawChapters || !Array.isArray(rawChapters)) return [];
  
  const chapters: ChapterData[] = [];
  const seenUrls = new Set<string>();
  
  for (const raw of rawChapters) {
    if (!raw.url || seenUrls.has(raw.url)) continue;
    seenUrls.add(raw.url);
    
    const number = raw.number || parseChapterNumber(raw.title);
    
    chapters.push({
      number,
      title: raw.title || null,
      url: raw.url,
      uploadDate: parseDate(raw.date),
      volume: raw.volume || null,
      source,
      valid: true,
    });
  }
  
  // Sort by chapter number (descending - newest first)
  chapters.sort((a, b) => {
    const numA = a.number ? parseFloat(a.number) : -1;
    const numB = b.number ? parseFloat(b.number) : -1;
    return numB - numA;
  });
  
  return chapters;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════

function isValidImageUrl(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  
  // Must start with http/https
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }
  
  // Check for placeholder images
  const placeholders = [
    "placeholder",
    "default",
    "no-image",
    "noimage",
    "blank",
    "missing",
    "1x1",
    "spacer.gif",
  ];
  
  const lower = trimmed.toLowerCase();
  for (const p of placeholders) {
    if (lower.includes(p)) return false;
  }
  
  return true;
}

function transformImages(raw: RawScrapedData): ImageData {
  return {
    cover: isValidImageUrl(raw.coverUrl) ? raw.coverUrl! : null,
    banner: isValidImageUrl(raw.bannerUrl) ? raw.bannerUrl! : null,
    thumbnail: isValidImageUrl(raw.thumbnailUrl) ? raw.thumbnailUrl! : null,
    additional: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════

function parseRating(rating?: number | string): number | null {
  if (rating === undefined || rating === null) return null;
  
  let num: number;
  if (typeof rating === "string") {
    // Handle "N/A", "Unknown", etc.
    if (!/\d/.test(rating)) return null;
    num = parseFloat(rating);
  } else {
    num = rating;
  }
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  // Normalize to 0-10 scale
  if (num > 10 && num <= 100) {
    num = num / 10;
  } else if (num > 100) {
    return null; // Invalid
  }
  
  // Round to 1 decimal
  return Math.round(num * 10) / 10;
}

function transformStats(raw: RawScrapedData): StatsData {
  return {
    rating: parseRating(raw.rating),
    ratingCount: raw.ratingCount && raw.ratingCount > 0 ? raw.ratingCount : null,
    popularity: raw.popularity && raw.popularity > 0 ? raw.popularity : null,
    views: raw.views && raw.views > 0 ? raw.views : null,
    bookmarks: raw.bookmarks && raw.bookmarks > 0 ? raw.bookmarks : null,
    comments: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

function transformContentClassification(
  genres: string[],
  type: MangaDocument["type"]
): ContentClassification {
  const restrictedIds = getRestrictedIdentifiers(genres);
  const isRestricted = restrictedIds.length > 0;
  const rating = getContentRating(genres);
  
  // Determine reading direction
  let readingDirection: ContentClassification["readingDirection"] = "ltr";
  if (type === "manga" || type === "doujinshi") {
    readingDirection = "rtl"; // Japanese manga reads right-to-left
  } else if (type === "manhwa" || type === "manhua") {
    readingDirection = "ttb"; // Korean/Chinese webtoons are vertical
  }
  
  return {
    rating,
    isRestricted,
    restrictedIdentifiers: restrictedIds,
    readingDirection,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH DATA TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════

function transformSearchData(
  title: string,
  altTitles: string[],
  nativeTitle: string | null
): SearchData {
  const titleKey = generateTitleKey(title);
  const keywords = generateSearchKeywords(title, altTitles, nativeTitle);
  const abbreviations = generateAbbreviations(title);
  
  // Add abbreviations to keywords
  for (const abbr of abbreviations) {
    if (!keywords.includes(abbr)) {
      keywords.push(abbr);
    }
  }
  
  return {
    titleKey,
    keywords,
    originalTitle: null, // Would need language detection
    englishTitle: title, // Assume main title is English
    romajiTitle: null, // Would need transliteration
    synonyms: [...altTitles],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ARRAY DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

function dedupeArray(arr: string[]): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const item of arr) {
    if (!item || typeof item !== "string") continue;
    const normalized = item.trim();
    const lower = normalized.toLowerCase();
    if (normalized.length > 0 && !seen.has(lower)) {
      seen.add(lower);
      result.push(normalized);
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TRANSFORM FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform raw scraped data into a normalized MangaDocument
 */
export function transformRawData(raw: RawScrapedData): MangaDocument | null {
  // Validate required fields
  if (!raw.title || raw.title.trim().length < 2) {
    return null;
  }
  if (!raw.url || !raw.url.startsWith("http")) {
    return null;
  }
  if (!raw.source) {
    return null;
  }
  
  const title = raw.title.trim();
  const altTitles = dedupeArray(raw.altTitles || []);
  const nativeTitle = raw.nativeTitle?.trim() || null;
  const genres = normalizeGenres(raw.genres || []);
  const tags = dedupeArray(raw.tags || []);
  const type = normalizeType(raw.type);
  const status = normalizeStatus(raw.status);
  const description = cleanDescription(raw.description);
  const authors = dedupeArray(raw.authors || []);
  const artists = dedupeArray(raw.artists || []);
  const chapters = transformChapters(raw.chapters, raw.source);
  
  // Calculate latest chapter
  let latestChapter: string | null = null;
  if (chapters.length > 0 && chapters[0].number) {
    latestChapter = chapters[0].number;
  }
  
  const now = new Date();
  
  const document: MangaDocument = {
    slug: generateSlug(title),
    title,
    altTitles,
    nativeTitle,
    description: isValidDescription(description) ? description : null,
    authors,
    artists,
    publisher: raw.publisher?.trim() || null,
    serialization: raw.serialization?.trim() || null,
    releaseYear: raw.releaseYear && raw.releaseYear > 1900 && raw.releaseYear <= new Date().getFullYear() + 1
      ? raw.releaseYear
      : null,
    status,
    type,
    country: raw.country?.trim() || null,
    language: raw.language?.trim() || null,
    genres,
    tags,
    demographic: raw.demographic?.trim() || null,
    contentClassification: transformContentClassification(genres, type),
    chapters,
    totalChapters: chapters.length,
    latestChapter,
    images: transformImages(raw),
    stats: transformStats(raw),
    relatedWorks: raw.relatedWorks || [],
    search: transformSearchData(title, altTitles, nativeTitle),
    sources: [{
      name: raw.source,
      url: raw.url,
      lastScraped: now,
      sourceId: raw.sourceId || null,
    }],
    createdAt: now,
    updatedAt: now,
    lastScrapedAt: now,
  };
  
  return document;
}

/**
 * Merge two manga documents (for deduplication)
 * The second document's data is merged into the first
 */
export function mergeDocuments(
  existing: MangaDocument,
  incoming: MangaDocument
): MangaDocument {
  const merged = { ...existing };
  const now = new Date();
  
  // Merge alt titles
  const allAltTitles = new Set([
    ...existing.altTitles,
    ...incoming.altTitles,
    incoming.title, // Add incoming title as alt if different
  ]);
  allAltTitles.delete(existing.title);
  merged.altTitles = [...allAltTitles];
  
  // Use better description
  if (
    (!existing.description || existing.description.length < 50) &&
    incoming.description &&
    incoming.description.length > (existing.description?.length || 0)
  ) {
    merged.description = incoming.description;
  }
  
  // Use native title if missing
  if (!existing.nativeTitle && incoming.nativeTitle) {
    merged.nativeTitle = incoming.nativeTitle;
  }
  
  // Merge authors
  merged.authors = dedupeArray([...existing.authors, ...incoming.authors]);
  
  // Merge artists
  merged.artists = dedupeArray([...existing.artists, ...incoming.artists]);
  
  // Use publisher if missing
  if (!existing.publisher && incoming.publisher) {
    merged.publisher = incoming.publisher;
  }
  
  // Use release year if missing
  if (!existing.releaseYear && incoming.releaseYear) {
    merged.releaseYear = incoming.releaseYear;
  }
  
  // Update status if we have better info
  if (existing.status === "unknown" && incoming.status !== "unknown") {
    merged.status = incoming.status;
  }
  
  // Update type if we have better info
  if (existing.type === "unknown" && incoming.type !== "unknown") {
    merged.type = incoming.type;
  }
  
  // Merge genres
  merged.genres = normalizeGenres([...existing.genres, ...incoming.genres]);
  
  // Merge tags
  merged.tags = dedupeArray([...existing.tags, ...incoming.tags]);
  
  // Reclassify content based on merged genres
  merged.contentClassification = transformContentClassification(merged.genres, merged.type);
  
  // Merge chapters (dedupe by URL)
  const chapterUrls = new Set(existing.chapters.map(c => c.url));
  for (const chapter of incoming.chapters) {
    if (!chapterUrls.has(chapter.url)) {
      merged.chapters.push(chapter);
      chapterUrls.add(chapter.url);
    }
  }
  
  // Re-sort chapters
  merged.chapters.sort((a, b) => {
    const numA = a.number ? parseFloat(a.number) : -1;
    const numB = b.number ? parseFloat(b.number) : -1;
    return numB - numA;
  });
  
  // Update chapter counts
  merged.totalChapters = merged.chapters.length;
  if (merged.chapters.length > 0 && merged.chapters[0].number) {
    merged.latestChapter = merged.chapters[0].number;
  }
  
  // Prefer higher quality cover image
  if (!existing.images.cover && incoming.images.cover) {
    merged.images.cover = incoming.images.cover;
  }
  if (!existing.images.banner && incoming.images.banner) {
    merged.images.banner = incoming.images.banner;
  }
  if (!existing.images.thumbnail && incoming.images.thumbnail) {
    merged.images.thumbnail = incoming.images.thumbnail;
  }
  
  // Merge stats (use higher values)
  if (incoming.stats.rating !== null) {
    if (existing.stats.rating === null) {
      merged.stats.rating = incoming.stats.rating;
    } else {
      // Average the ratings
      merged.stats.rating = Math.round((existing.stats.rating + incoming.stats.rating) / 2 * 10) / 10;
    }
  }
  if ((incoming.stats.views || 0) > (existing.stats.views || 0)) {
    merged.stats.views = incoming.stats.views;
  }
  if ((incoming.stats.bookmarks || 0) > (existing.stats.bookmarks || 0)) {
    merged.stats.bookmarks = incoming.stats.bookmarks;
  }
  
  // Merge sources
  const sourceNames = new Set(existing.sources.map(s => s.name));
  for (const source of incoming.sources) {
    if (!sourceNames.has(source.name)) {
      merged.sources.push(source);
      sourceNames.add(source.name);
    } else {
      // Update existing source's last scraped time
      const existingSource = merged.sources.find(s => s.name === source.name);
      if (existingSource) {
        existingSource.lastScraped = now;
        if (source.url) existingSource.url = source.url;
      }
    }
  }
  
  // Update search data
  merged.search = transformSearchData(merged.title, merged.altTitles, merged.nativeTitle);
  
  // Update timestamps
  merged.updatedAt = now;
  merged.lastScrapedAt = now;
  
  return merged;
}
