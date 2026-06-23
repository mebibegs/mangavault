import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

// Don't throw at build time — only warn. The app will fail gracefully at runtime
// if DATABASE_URL is not set when a database operation is attempted.
if (!databaseUrl && process.env.NODE_ENV !== "production") {
  console.warn("DATABASE_URL is not set — database features will be unavailable");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Create pool lazily only if DATABASE_URL is available
function getPool(): Pool | null {
  if (!databaseUrl) return null;
  
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: databaseUrl,
    });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

export const pool = getPool();

// Create a db instance that will work when DATABASE_URL is set
// If not set, db operations will fail at runtime (not build time)
export const db = databaseUrl 
  ? drizzle(pool!, { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

/**
 * Check if database is available. Use this before db operations
 * to gracefully handle missing database configuration.
 */
export function isDatabaseAvailable(): boolean {
  return !!databaseUrl && !!pool;
}
