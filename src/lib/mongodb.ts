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

  await Promise.allSettled([
    titles.createIndex({ titleKey: 1 }, { unique: true }),
    titles.createIndex({ genres: 1 }),
    titles.createIndex({ updatedAt: -1 }),
    titles.createIndex({ rating: -1 }),
    titles.createIndex({ status: 1 }),
    titles.createIndex({ type: 1 }),
    titles.createIndex(
      { title: "text", description: "text" },
      { weights: { title: 10, description: 1 }, name: "text_search" }
    ),
  ]);
}
