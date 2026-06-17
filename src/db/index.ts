import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: databaseUrl,
    });
  }

  return globalForDb.__arenaNextJsPostgresqlPool;
}

// Lazy initialization - only creates connection when db is actually used
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const pool = getPool();
    const drizzleDb = drizzle(pool);
    return (drizzleDb as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { getPool as pool };
