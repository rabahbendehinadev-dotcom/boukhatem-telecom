import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

/** Shipping rates per Algerian wilaya (58 wilayas). */
export const shippingRatesTable = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  wilayaCode: text("wilaya_code").notNull().unique(),         // "01" – "58"
  wilayaName: text("wilaya_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  homeDeliveryEnabled: boolean("home_delivery_enabled").notNull().default(true),
  officeDeliveryEnabled: boolean("office_delivery_enabled").notNull().default(true),
  homeDeliveryPrice: integer("home_delivery_price").notNull().default(500),   // DA
  officeDeliveryPrice: integer("office_delivery_price").notNull().default(350), // DA
  minDeliveryDays: integer("min_delivery_days").notNull().default(2),
  maxDeliveryDays: integer("max_delivery_days").notNull().default(3),
  carrier: text("carrier").default("manual"),  // 'manual' | 'noest' | other
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ShippingRate = typeof shippingRatesTable.$inferSelect;

/** Stop-desk offices per wilaya — kept for future use, not exposed in UI yet */
export const shippingOfficesTable = pgTable("shipping_offices", {
  id: serial("id").primaryKey(),
  wilayaCode: text("wilaya_code").notNull(),
  name: text("name").notNull(),
  commune: text("commune"),
  address: text("address"),
  phone: text("phone"),
  openingHours: text("opening_hours"),
  carrier: text("carrier").default("manual"),
  externalOfficeId: text("external_office_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ShippingOffice = typeof shippingOfficesTable.$inferSelect;
