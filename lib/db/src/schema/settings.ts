import { pgTable, text, serial, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
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
  servicesSectionTitle: text("services_section_title").notNull().default("Nos services en ligne"),
  flexyTitle: text("flexy_title").notNull().default("Application Flexy"),
  flexyDescription: text("flexy_description").notNull().default("Téléchargez notre application Flexy"),
  flexyButtonText: text("flexy_button_text").notNull().default("Télécharger l'application"),
  flexyUrl: text("flexy_url"),
  flexyEnabled: boolean("flexy_enabled").notNull().default(false),
  paymentTitle: text("payment_title").notNull().default("Paiement en ligne"),
  paymentDescription: text("payment_description").notNull().default("Payez rapidement et en toute sécurité"),
  paymentButtonText: text("payment_button_text").notNull().default("Payer maintenant"),
  paymentUrl: text("payment_url"),
  paymentEnabled: boolean("payment_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
