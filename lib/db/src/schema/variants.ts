import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const productOptionsTable = pgTable("product_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  productNameUnique: unique("product_options_product_name_unique").on(table.productId, table.name),
  productIdUnique: unique("product_options_product_id_id_unique").on(table.id, table.productId),
  productIndex: index("product_options_product_id_idx").on(table.productId),
}));

export const productOptionValuesTable = pgTable("product_option_values", {
  id: serial("id").primaryKey(),
  optionId: integer("option_id").notNull().references(() => productOptionsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  value: text("value").notNull(),
  colorHex: text("color_hex"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  optionValueUnique: unique("product_option_values_option_value_unique").on(table.optionId, table.value),
  productValueUnique: unique("product_option_values_product_id_id_unique").on(table.id, table.productId),
  optionIndex: index("product_option_values_option_id_idx").on(table.optionId),
  productIndex: index("product_option_values_product_id_idx").on(table.productId),
  optionProductFk: foreignKey({ columns: [table.optionId, table.productId], foreignColumns: [productOptionsTable.id, productOptionsTable.productId], name: "product_option_values_option_product_fk" }),
}));

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: numeric("compare_price", { precision: 10, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
  barcode: text("barcode"),
  imageUrl: text("image_url"),
  optionSignature: text("option_signature").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  productIndex: index("product_variants_product_id_idx").on(table.productId),
  productIdUnique: unique("product_variants_product_id_id_unique").on(table.id, table.productId),
  activeIndex: index("product_variants_product_active_idx").on(table.productId, table.isActive),
  productSkuUnique: unique("product_variants_product_sku_unique").on(table.productId, table.sku),
  productSignatureUnique: unique("product_variants_product_signature_unique").on(table.productId, table.optionSignature),
}));

export const productVariantValuesTable = pgTable("product_variant_values", {
  variantId: integer("variant_id").notNull().references(() => productVariantsTable.id, { onDelete: "cascade" }),
  optionValueId: integer("option_value_id").notNull().references(() => productOptionValuesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
}, (table) => ({
  variantValueUnique: unique("product_variant_values_variant_value_unique").on(table.variantId, table.optionValueId),
  variantIndex: index("product_variant_values_variant_id_idx").on(table.variantId),
  valueIndex: index("product_variant_values_option_value_id_idx").on(table.optionValueId),
  variantProductFk: foreignKey({ columns: [table.variantId, table.productId], foreignColumns: [productVariantsTable.id, productVariantsTable.productId], name: "product_variant_values_variant_product_fk" }),
  valueProductFk: foreignKey({ columns: [table.optionValueId, table.productId], foreignColumns: [productOptionValuesTable.id, productOptionValuesTable.productId], name: "product_variant_values_value_product_fk" }),
}));

export const insertProductOptionSchema = createInsertSchema(productOptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductOptionValueSchema = createInsertSchema(productOptionValuesTable).omit({ id: true, createdAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type ProductOption = typeof productOptionsTable.$inferSelect;
export type ProductOptionValue = typeof productOptionValuesTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;