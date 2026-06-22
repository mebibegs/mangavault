import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
