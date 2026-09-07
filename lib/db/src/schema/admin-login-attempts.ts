import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const adminLoginAttemptsTable = pgTable("admin_login_attempts", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
