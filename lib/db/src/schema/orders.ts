import { pgTable, text, serial, timestamp, integer, numeric, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  idempotencyKey: text("idempotency_key"),
  userId: integer("user_id"), // nullable for guest orders
  status: text("status").notNull().default("pending"), // pending, confirmed, processing, shipped, delivered, cancelled
  // payment fields
  paymentMethod: text("payment_method").notNull().default("cash_on_delivery"), // cash_on_delivery, bank_transfer, cib_edahabia
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, awaiting_confirmation, confirmed, failed
  paymentProofUrl: text("payment_proof_url"),
  paymentNotes: text("payment_notes"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  couponCode: text("coupon_code"),
  shipping: numeric("shipping", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  items: jsonb("items").notNull(),
  notes: text("notes"),
  // Shipping metadata (saved at order time — never changes even if rates change later)
  deliveryType: text("delivery_type"),                // 'home' | 'office'
  shippingWilayaCode: text("shipping_wilaya_code"),   // '16'
  shippingWilayaName: text("shipping_wilaya_name"),   // 'Alger'
  shippingOfficeId: integer("shipping_office_id"),    // FK → shipping_offices.id
  shippingOfficeName: text("shipping_office_name"),
  estimatedDeliveryMinDays: integer("estimated_delivery_min_days"),
  estimatedDeliveryMaxDays: integer("estimated_delivery_max_days"),
  // NOEST Express delivery fields
  deliveryProvider: text("delivery_provider"),        // 'noest' | null
  noestShipmentId: text("noest_shipment_id"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  labelUrl: text("label_url"),
  deliveryStatus: text("delivery_status"),            // sent_to_noest | en_preparation | ... | livre
  sentToCarrierAt: timestamp("sent_to_carrier_at", { withTimezone: true }),
  lastTrackingSyncAt: timestamp("last_tracking_sync_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  // Composite unique: one idempotency key per user (NULLs are excluded automatically by PG)
  userIdempotencyUnique: unique("orders_user_idempotency_key_unique").on(table.userId, table.idempotencyKey),
}));

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
