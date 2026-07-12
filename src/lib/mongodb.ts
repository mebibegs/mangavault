import { MongoClient, ObjectId, type Db } from "mongodb";

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

async function dedupeTitleKeys(db: Db): Promise<void> {
  const titles = db.collection("titles");
  const duplicates = await titles.aggregate<{ _id: string; ids: ObjectId[]; count: number }>([
    { $match: { titleKey: { $exists: true, $ne: "" } } },
    { $sort: { updatedAt: -1, chapterCount: -1 } },
    { $group: { _id: "$titleKey", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  for (const duplicate of duplicates) {
    const [, ...removeIds] = duplicate.ids;
    if (removeIds.length > 0) {
      await titles.deleteMany({ _id: { $in: removeIds } });
    }
  }
}

export async function ensureIndexes(): Promise<void> {
  const db = await getMongoDb();
  if (!db) return;

  const titles = db.collection("titles");

  await dedupeTitleKeys(db).catch((err) => {
    console.error("[MongoDB] failed to deduplicate titleKey values before indexing:", err);
  });

  await Promise.allSettled([
    titles.createIndex({ titleKey: 1 }, { unique: true }),
    titles.createIndex({ genres: 1 }),
    titles.createIndex({ updatedAt: -1 }),
    titles.createIndex({ rating: -1 }),
    titles.createIndex({ status: 1 }),
    titles.createIndex({ type: 1 }),
  ]);

  await ensureTextIndex();
}

export async function ensureTextIndex(): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;

  const titles = db.collection("titles");
  try {
    await titles.createIndex(
      { title: "text", description: "text", genres: "text" },
      { weights: { title: 10, genres: 4, description: 1 }, name: "text_search" }
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/conflict|already exists with different options|IndexKeySpecsConflict/i.test(msg)) {
      try {
        await titles.dropIndex("text_search").catch(() => titles.dropIndex("_text_").catch(() => undefined));
        await titles.createIndex(
          { title: "text", description: "text", genres: "text" },
          { weights: { title: 10, genres: 4, description: 1 }, name: "text_search" }
        );
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
