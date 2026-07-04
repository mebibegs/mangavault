import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDrizzle?: ReturnType<typeof drizzle>;
};

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  return new Pool({ connectionString: databaseUrl });
}

/**
 * Lazy connection.
 *
 * The pool / drizzle client are NOT created at module-import time. This matters
 * because Next.js statically imports every route module during `next build`
 * ("collecting page data"). If this module threw at import time (the old
 * behaviour) and DATABASE_URL was absent in the build environment, the entire
 * production build would crash with:
 *
 *     Error: DATABASE_URL is required
 *     Error: Failed to collect page data for /api/health
 *
 * By deferring creation to the first actual query, the build succeeds even when
 * no DATABASE_URL is configured, and the error only surfaces at request time
 * (where it belongs).
 */
function getDb(): ReturnType<typeof drizzle> {
  if (globalForDb.__arenaNextJsDrizzle) return globalForDb.__arenaNextJsDrizzle;
  const pool = globalForDb.__arenaNextJsPostgresqlPool ?? createPool();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  const instance = drizzle(pool);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsDrizzle = instance;
  }
  return instance;
}

/**
 * `db` is a proxy that lazily resolves the real drizzle client on first access.
 * This preserves the `import { db }` API used across the app while keeping
 * connection creation deferred to request time.
 */
export const db = new Proxy(
  {} as ReturnType<typeof drizzle>,
  {
    get(_target, prop) {
      const instance = getDb() as unknown as Record<string | symbol, unknown>;
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  }
) as ReturnType<typeof drizzle>;
