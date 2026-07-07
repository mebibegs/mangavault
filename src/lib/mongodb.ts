import { MongoClient, type Db } from "mongodb";

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
        maxPoolSize: 10,
        minPoolSize: 2,
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

export async function ensureIndexes(): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  const titles = db.collection("titles");

  // titleKey unique index is created non-unique-tolerant: if duplicate keys
  // already exist, createIndex({unique:true}) throws, but allSettled swallows
  // it so the other indexes still get created.
  await Promise.allSettled([
    titles.createIndex({ titleKey: 1 }, { unique: true }),
    titles.createIndex({ genres: 1 }),
    titles.createIndex({ updatedAt: -1 }),
    titles.createIndex({ rating: -1 }),
    titles.createIndex({ status: 1 }),
    titles.createIndex({ type: 1 }),
  ]);

  // Text index is created separately so an IndexOptionsConflict (e.g. an
  // existing text index with different weights) doesn't block the others,
  // and so it can be requested on-demand by the search route.
  await ensureTextIndex();
}

/**
 * Ensure a full-text search index exists on the titles collection.
 *
 * The search API uses `{ $text: { $search } }`, which throws
 * `IndexNotFound (code 27) — text index required for $text query` if no text
 * index is present. This is called lazily from the search route the first time
 * a $text query fails, so search self-heals instead of returning 500s.
 *
 * If a text index already exists with different options, MongoDB rejects the
 * create with `IndexOptionsConflict` — we drop & recreate it so the desired
 * weights are always in effect.
 */
let textIndexEnsured = false;
export async function ensureTextIndex(): Promise<boolean> {
  if (textIndexEnsured) return true;
  const db = await getMongoDb();
  if (!db) return false;

  const titles = db.collection("titles");
  try {
    await titles.createIndex(
      { title: "text", description: "text" },
      { weights: { title: 10, description: 1 }, name: "text_search" }
    );
    textIndexEnsured = true;
    console.log("[MongoDB] text_search index ensured");
    return true;
  } catch (err) {
    // IndexOptionsConflict / IndexKeySpecsConflict — a text index exists but
    // with different specs. Drop it and recreate with our weights.
    const msg = err instanceof Error ? err.message : String(err);
    if (/conflict|already exists with different options|IndexKeySpecsConflict/i.test(msg)) {
      try {
        await titles.dropIndex("text_search").catch(() => titles.dropIndex("_text_").catch(() => {}));
        await titles.createIndex(
          { title: "text", description: "text" },
          { weights: { title: 10, description: 1 }, name: "text_search" }
        );
        textIndexEnsured = true;
        console.log("[MongoDB] text_search index recreated");
        return true;
      } catch (err2) {
        console.error("[MongoDB] failed to recreate text index:", err2 instanceof Error ? err2.message : err2);
        return false;
      }
    }
    console.error("[MongoDB] failed to create text index:", msg);
    return false;
  }
}
