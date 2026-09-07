import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull().default("BOUKHATEM TELECOM"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).notNull().default("500"),
  freeShippingThreshold: numeric("free_shipping_threshold", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
