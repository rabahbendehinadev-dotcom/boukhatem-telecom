import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bannersTable = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  mobileImageUrl: text("mobile_image_url"),
  linkUrl: text("link_url"),
  buttonText: text("button_text"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  desktopPosition: text("desktop_position").notNull().default("left"),
  mobilePosition: text("mobile_position").notNull().default("left"),
  showTitleDesktop: boolean("show_title_desktop").notNull().default(true),
  showButtonDesktop: boolean("show_button_desktop").notNull().default(true),
  showTitleMobile: boolean("show_title_mobile").notNull().default(true),
  showButtonMobile: boolean("show_button_mobile").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBannerSchema = createInsertSchema(bannersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof bannersTable.$inferSelect;
