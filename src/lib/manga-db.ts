/**
 * Enhanced MongoDB Client for MangaVault
 * 
 * Handles all database operations for manga documents including:
 * - CRUD operations
 * - Deduplication and merging
 * - Search functionality
 * - Index management
 */

import { MongoClient, type Db, type Collection, ObjectId } from "mongodb";
import type { MangaDocument, SyncResult } from "./types/manga";
import { generateTitleKey, titlesMatch } from "./slug-generator";
import { mergeDocuments } from "./data-transformer";

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION
// ═══════════════════════════════════════════════════════════════════════════

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "mangavault";

if (!MONGODB_URI) {
  console.warn("MONGODB_URI not set — MongoDB features will be disabled");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoDb(): Promise<Db | null> {
  if (!MONGODB_URI) return null;
  if (cachedDb) return cachedDb;

  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(MONGODB_URI, {
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 60_000,
        connectTimeoutMS: 10_000,
        serverSelectionTimeoutMS: 10_000,
      });
      await cachedClient.connect();
    }
    cachedDb = cachedClient.db(MONGODB_DB);
    return cachedDb;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    return null;
  }
}

export async function getMangaCollection(): Promise<Collection<MangaDocument> | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<MangaDocument>("manga");
}

// ═══════════════════════════════════════════════════════════════════════════
// INDEX MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export async function ensureMangaIndexes(): Promise<void> {
  const collection = await getMangaCollection();
  if (!collection) return;

  try {
    await Promise.allSettled([
      // Unique slug index
      collection.createIndex({ slug: 1 }, { unique: true }),
      
      // Title key for deduplication
      collection.createIndex({ "search.titleKey": 1 }),
      
      // Search keywords
      collection.createIndex({ "search.keywords": 1 }),
      
      // Full-text search
      collection.createIndex(
        {
          title: "text",
          "search.synonyms": "text",
          description: "text",
          "search.keywords": "text",
        },
        {
          weights: {
            title: 10,
            "search.synonyms": 8,
            description: 2,
            "search.keywords": 5,
          },
          name: "manga_text_search",
        }
      ),
      
      // Filtering indexes
      collection.createIndex({ genres: 1 }),
      collection.createIndex({ type: 1 }),
      collection.createIndex({ status: 1 }),
      collection.createIndex({ "contentClassification.isRestricted": 1 }),
      collection.createIndex({ "contentClassification.rating": 1 }),
      
      // Sorting indexes
      collection.createIndex({ "stats.rating": -1 }),
      collection.createIndex({ "stats.views": -1 }),
      collection.createIndex({ updatedAt: -1 }),
      collection.createIndex({ createdAt: -1 }),
      collection.createIndex({ totalChapters: -1 }),
      
      // Source tracking
      collection.createIndex({ "sources.name": 1 }),
      collection.createIndex({ "sources.url": 1 }),
      
      // Compound indexes for common queries
      collection.createIndex({
        "contentClassification.isRestricted": 1,
        "stats.rating": -1,
      }),
      collection.createIndex({
        "contentClassification.isRestricted": 1,
        updatedAt: -1,
      }),
      collection.createIndex({
        type: 1,
        "contentClassification.isRestricted": 1,
        "stats.rating": -1,
      }),
    ]);

    console.log("MongoDB indexes created successfully");
  } catch (err) {
    console.error("Error creating MongoDB indexes:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find a manga by its slug
 */
export async function findBySlug(slug: string): Promise<MangaDocument | null> {
  const collection = await getMangaCollection();
  if (!collection) return null;
  
  return collection.findOne({ slug });
}

/**
 * Find a manga by its title key
 */
export async function findByTitleKey(titleKey: string): Promise<MangaDocument | null> {
  const collection = await getMangaCollection();
  if (!collection) return null;
  
  return collection.findOne({ "search.titleKey": titleKey });
}

/**
 * Find potential duplicates for a manga
 */
export async function findPotentialDuplicates(
  title: string,
  altTitles: string[] = []
): Promise<MangaDocument[]> {
  const collection = await getMangaCollection();
  if (!collection) return [];
  
  const titleKey = generateTitleKey(title);
  const altKeys = altTitles.map(t => generateTitleKey(t)).filter(k => k.length >= 3);
  const allKeys = [titleKey, ...altKeys];
  
  // Find by title key match
  const candidates = await collection.find({
    $or: [
      { "search.titleKey": { $in: allKeys } },
      { "search.keywords": { $in: allKeys } },
    ]
  }).limit(20).toArray();
  
  return candidates;
}

/**
 * Insert a new manga document
 */
export async function insertManga(doc: MangaDocument): Promise<ObjectId | null> {
  const collection = await getMangaCollection();
  if (!collection) return null;
  
  try {
    const result = await collection.insertOne(doc);
    return result.insertedId;
  } catch (err) {
    // Handle duplicate key error
    if (err instanceof Error && err.message.includes("duplicate key")) {
      console.warn(`Duplicate manga: ${doc.title}`);
      return null;
    }
    throw err;
  }
}

/**
 * Update an existing manga document
 */
export async function updateManga(
  slug: string,
  updates: Partial<MangaDocument>
): Promise<boolean> {
  const collection = await getMangaCollection();
  if (!collection) return false;
  
  const result = await collection.updateOne(
    { slug },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  );
  
  return result.modifiedCount > 0;
}

/**
 * Upsert a manga document with deduplication
 */
export async function upsertManga(
  doc: MangaDocument
): Promise<{ action: "inserted" | "updated" | "merged" | "skipped"; id: ObjectId | null }> {
  const collection = await getMangaCollection();
  if (!collection) return { action: "skipped", id: null };
  
  // Find potential duplicates
  const duplicates = await findPotentialDuplicates(doc.title, doc.altTitles);
  
  for (const existing of duplicates) {
    // Check if this is actually a match
    if (titlesMatch(doc.title, doc.altTitles, existing.title, existing.altTitles)) {
      // Merge the documents
      const merged = mergeDocuments(existing, doc);
      
      await collection.updateOne(
        { _id: existing._id },
        { $set: merged }
      );
      
      return { action: "merged", id: existing._id! };
    }
  }
  
  // No duplicate found, check by slug
  const bySlug = await findBySlug(doc.slug);
  if (bySlug) {
    // Slug exists but it's not a duplicate - need unique slug
    let counter = 2;
    let newSlug = `${doc.slug}-${counter}`;
    while (await findBySlug(newSlug)) {
      counter++;
      newSlug = `${doc.slug}-${counter}`;
      if (counter > 100) break;
    }
    doc.slug = newSlug;
  }
  
  // Insert new document
  const id = await insertManga(doc);
  return { action: id ? "inserted" : "skipped", id };
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Upsert a batch of manga documents
 */
export async function upsertMangaBatch(
  docs: MangaDocument[],
  source: string
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    source,
    inserted: 0,
    updated: 0,
    merged: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    errors: [],
  };
  
  const collection = await getMangaCollection();
  if (!collection) {
    result.errors.push("MongoDB not available");
    result.duration = Date.now() - startTime;
    return result;
  }
  
  for (const doc of docs) {
    try {
      const { action } = await upsertManga(doc);
      
      switch (action) {
        case "inserted":
          result.inserted++;
          break;
        case "updated":
          result.updated++;
          break;
        case "merged":
          result.merged++;
          break;
        case "skipped":
          result.skipped++;
          break;
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`Failed to upsert "${doc.title}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  result.duration = Date.now() - startTime;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchOptions {
  query: string;
  page?: number;
  limit?: number;
  includeRestricted?: boolean;
  genres?: string[];
  type?: MangaDocument["type"];
  status?: MangaDocument["status"];
}

export interface SearchResult {
  results: MangaDocument[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Search for manga with various filters
 */
export async function searchManga(options: SearchOptions): Promise<SearchResult> {
  const collection = await getMangaCollection();
  if (!collection) {
    return { results: [], total: 0, page: 1, totalPages: 0 };
  }
  
  const {
    query,
    page = 1,
    limit = 20,
    includeRestricted = false,
    genres,
    type,
    status,
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build filter
  const filter: Record<string, unknown> = {};
  
  if (!includeRestricted) {
    filter["contentClassification.isRestricted"] = false;
  }
  
  if (genres && genres.length > 0) {
    filter.genres = { $all: genres };
  }
  
  if (type) {
    filter.type = type;
  }
  
  if (status) {
    filter.status = status;
  }
  
  // Search using text index
  if (query && query.trim().length > 0) {
    filter.$text = { $search: query };
  }
  
  // Get total count
  const total = await collection.countDocuments(filter);
  
  // Get results
  let cursor = collection.find(filter);
  
  if (query && query.trim().length > 0) {
    // Sort by text score when searching
    cursor = cursor.sort({ score: { $meta: "textScore" } });
  } else {
    // Sort by rating when browsing
    cursor = cursor.sort({ "stats.rating": -1, updatedAt: -1 });
  }
  
  const results = await cursor.skip(skip).limit(limit).toArray();
  
  return {
    results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get trending/popular manga
 */
export async function getTrendingManga(
  limit: number = 20,
  includeRestricted: boolean = false
): Promise<MangaDocument[]> {
  const collection = await getMangaCollection();
  if (!collection) return [];
  
  const filter: Record<string, unknown> = {};
  if (!includeRestricted) {
    filter["contentClassification.isRestricted"] = false;
  }
  
  return collection
    .find(filter)
    .sort({ "stats.views": -1, "stats.rating": -1, updatedAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get recently updated manga
 */
export async function getRecentManga(
  limit: number = 20,
  includeRestricted: boolean = false
): Promise<MangaDocument[]> {
  const collection = await getMangaCollection();
  if (!collection) return [];
  
  const filter: Record<string, unknown> = {};
  if (!includeRestricted) {
    filter["contentClassification.isRestricted"] = false;
  }
  
  return collection
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get manga by genre
 */
export async function getMangaByGenre(
  genre: string,
  page: number = 1,
  limit: number = 20,
  includeRestricted: boolean = false
): Promise<SearchResult> {
  const collection = await getMangaCollection();
  if (!collection) {
    return { results: [], total: 0, page: 1, totalPages: 0 };
  }
  
  const filter: Record<string, unknown> = {
    genres: genre,
  };
  
  if (!includeRestricted) {
    filter["contentClassification.isRestricted"] = false;
  }
  
  const skip = (page - 1) * limit;
  const total = await collection.countDocuments(filter);
  const results = await collection
    .find(filter)
    .sort({ "stats.rating": -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  return {
    results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get total document count
 */
export async function getTotalCount(): Promise<number> {
  const collection = await getMangaCollection();
  if (!collection) return 0;
  return collection.countDocuments();
}

/**
 * Get all unique genres
 */
export async function getAllGenres(): Promise<string[]> {
  const collection = await getMangaCollection();
  if (!collection) return [];
  
  const genres = await collection.distinct("genres");
  return genres.sort();
}

/**
 * Get database statistics
 */
export async function getDbStats(): Promise<{
  total: number;
  restricted: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  sources: string[];
}> {
  const collection = await getMangaCollection();
  if (!collection) {
    return { total: 0, restricted: 0, byType: {}, byStatus: {}, sources: [] };
  }
  
  const [total, restricted, types, statuses, sources] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ "contentClassification.isRestricted": true }),
    collection.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]).toArray(),
    collection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray(),
    collection.distinct("sources.name"),
  ]);
  
  const byType: Record<string, number> = {};
  for (const t of types) {
    byType[t._id as string] = t.count;
  }
  
  const byStatus: Record<string, number> = {};
  for (const s of statuses) {
    byStatus[s._id as string] = s.count;
  }
  
  return { total, restricted, byType, byStatus, sources };
}

/**
 * Clear all manga documents (use with caution!)
 */
export async function clearAllManga(): Promise<number> {
  const collection = await getMangaCollection();
  if (!collection) return 0;
  
  const result = await collection.deleteMany({});
  return result.deletedCount;
}
