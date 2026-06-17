import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";

export const requestLogs = pgTable("request_logs", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code"),
  query: text("query"),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const blockedIps = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull().unique(),
  reason: text("reason").notNull(),
  blockedAt: timestamp("blocked_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  permanent: boolean("permanent").default(false),
});

export const searchCache = pgTable("search_cache", {
  id: serial("id").primaryKey(),
  query: varchar("query", { length: 255 }).notNull(),
  results: text("results").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
