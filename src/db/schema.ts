import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cache table for search results, trending, etc.
export const cache = pgTable(
  "cache",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cache_expires_idx").on(table.expiresAt),
  ]
);

// Query frequency tracking for cache pre-warming
export const queryStats = pgTable(
  "query_stats",
  {
    query: text("query").primaryKey(),
    count: text("count").notNull().default("1"), // Using text to avoid bigint issues
    lastSearched: timestamp("last_searched").defaultNow().notNull(),
  },
  (table) => [
    index("query_stats_count_idx").on(table.count),
  ]
);
