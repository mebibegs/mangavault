/**
 * Comprehensive Manga/Manhwa/Manhua types for MangaVault
 * This file defines the complete data model for storing manga metadata
 */

import { ObjectId } from "mongodb";

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ChapterData {
  /** Chapter number (e.g., "1", "1.5", "102") */
  number: string | null;
  /** Chapter title (e.g., "The Beginning") */
  title: string | null;
  /** Full URL to read the chapter */
  url: string;
  /** Upload/release date */
  uploadDate: Date | null;
  /** Volume number if available */
  volume: string | null;
  /** Source this chapter came from */
  source: string;
  /** Whether chapter was scraped successfully */
  valid: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE LINK TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SourceLink {
  /** Source name (e.g., "Asura Scans", "Manganato") */
  name: string;
  /** URL to the manga on this source */
  url: string;
  /** Last time this source was scraped */
  lastScraped: Date;
  /** Source-specific ID if available */
  sourceId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ImageData {
  /** Cover image URL (highest quality) */
  cover: string | null;
  /** Banner/header image if available */
  banner: string | null;
  /** Thumbnail (smaller cover) */
  thumbnail: string | null;
  /** Additional artwork URLs */
  additional: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface StatsData {
  /** Average rating (0-10 scale) */
  rating: number | null;
  /** Number of ratings/votes */
  ratingCount: number | null;
  /** Popularity ranking */
  popularity: number | null;
  /** Total views */
  views: number | null;
  /** Number of bookmarks/follows */
  bookmarks: number | null;
  /** Number of comments */
  comments: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATIONSHIP TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RelatedWork {
  /** Title of related work */
  title: string;
  /** Relationship type */
  type: "prequel" | "sequel" | "spinoff" | "adaptation" | "alternative" | "related";
  /** URL if known */
  url: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchData {
  /** Normalized title key for deduplication */
  titleKey: string;
  /** All searchable keywords (lowercased, normalized) */
  keywords: string[];
  /** Original title */
  originalTitle: string | null;
  /** English title */
  englishTitle: string | null;
  /** Romaji title */
  romajiTitle: string | null;
  /** All synonyms/alternative titles */
  synonyms: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export type ContentRating = "safe" | "suggestive" | "mature" | "explicit";

export interface ContentClassification {
  /** Overall content rating */
  rating: ContentRating;
  /** Whether this should be hidden from main listings */
  isRestricted: boolean;
  /** Internal identifiers for restricted genres */
  restrictedIdentifiers: string[];
  /** Reading direction */
  readingDirection: "ltr" | "rtl" | "ttb";
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MANGA DOCUMENT TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface MangaDocument {
  /** MongoDB ObjectId */
  _id?: ObjectId;
  
  // ─────────────────────────────────────────────────────────────────────────
  // BASIC INFORMATION
  // ─────────────────────────────────────────────────────────────────────────
  
  /** URL-safe slug (unique) */
  slug: string;
  /** Primary display title */
  title: string;
  /** Alternative titles */
  altTitles: string[];
  /** Native language title */
  nativeTitle: string | null;
  /** Full description/synopsis */
  description: string | null;
  /** Author name(s) */
  authors: string[];
  /** Artist name(s) */
  artists: string[];
  /** Publisher */
  publisher: string | null;
  /** Serialization magazine/platform */
  serialization: string | null;
  /** Release year */
  releaseYear: number | null;
  /** Publication status */
  status: "ongoing" | "completed" | "hiatus" | "cancelled" | "unknown";
  /** Content type */
  type: "manga" | "manhwa" | "manhua" | "novel" | "oneshot" | "doujinshi" | "unknown";
  /** Country of origin */
  country: string | null;
  /** Original language */
  language: string | null;
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTENT INFORMATION
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Normalized genres (alphabetically sorted) */
  genres: string[];
  /** Tags/themes */
  tags: string[];
  /** Demographic (shounen, seinen, shoujo, josei) */
  demographic: string | null;
  /** Content classification */
  contentClassification: ContentClassification;
  
  // ─────────────────────────────────────────────────────────────────────────
  // CHAPTER INFORMATION
  // ─────────────────────────────────────────────────────────────────────────
  
  /** All chapters from all sources */
  chapters: ChapterData[];
  /** Total chapter count (best estimate) */
  totalChapters: number;
  /** Latest chapter number */
  latestChapter: string | null;
  
  // ─────────────────────────────────────────────────────────────────────────
  // IMAGES
  // ─────────────────────────────────────────────────────────────────────────
  
  images: ImageData;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────────────────────────────────
  
  stats: StatsData;
  
  // ─────────────────────────────────────────────────────────────────────────
  // RELATIONSHIPS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Related works (prequels, sequels, etc.) */
  relatedWorks: RelatedWork[];
  
  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH DATA
  // ─────────────────────────────────────────────────────────────────────────
  
  search: SearchData;
  
  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE TRACKING
  // ─────────────────────────────────────────────────────────────────────────
  
  /** All sources this manga was found on */
  sources: SourceLink[];
  
  // ─────────────────────────────────────────────────────────────────────────
  // TIMESTAMPS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Document creation time */
  createdAt: Date;
  /** Last update time */
  updatedAt: Date;
  /** Last successful scrape time */
  lastScrapedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRAPER RAW DATA TYPE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Raw data extracted from a scraper before normalization
 */
export interface RawScrapedData {
  // Required
  title: string;
  url: string;
  source: string;
  
  // Optional basic info
  altTitles?: string[];
  nativeTitle?: string;
  description?: string;
  authors?: string[];
  artists?: string[];
  publisher?: string;
  serialization?: string;
  releaseYear?: number;
  status?: string;
  type?: string;
  country?: string;
  language?: string;
  
  // Content
  genres?: string[];
  tags?: string[];
  demographic?: string;
  
  // Chapters
  chapters?: Array<{
    number?: string;
    title?: string;
    url: string;
    date?: string;
    volume?: string;
  }>;
  
  // Images
  coverUrl?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  
  // Stats
  rating?: number | string;
  ratingCount?: number;
  views?: number;
  bookmarks?: number;
  popularity?: number;
  
  // Relationships
  relatedWorks?: RelatedWork[];
  
  // Source-specific ID
  sourceId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncResult {
  source: string;
  inserted: number;
  updated: number;
  merged: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

export interface FullSyncResult {
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  totalDuration: number;
  totalInserted: number;
  totalUpdated: number;
  totalMerged: number;
  totalFailed: number;
  totalDocuments: number;
  sourceResults: SyncResult[];
  errors: string[];
}
