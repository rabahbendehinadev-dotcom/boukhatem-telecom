import { and, eq } from "drizzle-orm";
import { db, productsTable, productVariantsTable, productVariantValuesTable, productOptionValuesTable, productOptionsTable } from "@workspace/db";

export async function resolveCatalogItem(productId: number, variantId?: number | null, executor: any = db) {
  const [product] = await executor.select().from(productsTable).where(eq(productsTable.id, productId)).for("update");
  if (!product) return null;
  if (variantId == null) {
    const [existingVariant] = await executor.select({ id: productVariantsTable.id }).from(productVariantsTable).where(eq(productVariantsTable.productId, productId)).limit(1).for("update");
    if (existingVariant) return null;
    return { product, variant: null, imageUrl: product.images?.[0] || null, price: Number(product.price), comparePrice: product.comparePrice == null ? null : Number(product.comparePrice), stock: product.stock, sku: product.sku, barcode: product.barcode, label: product.name, optionSnapshots: [] };
  }
  const [variant] = await executor.select().from(productVariantsTable).where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId))).for("update");
  if (!variant || !variant.isActive) return null;
  const rows = await executor.select({ value: productOptionValuesTable, option: productOptionsTable })
    .from(productVariantValuesTable)
    .innerJoin(productOptionValuesTable, eq(productVariantValuesTable.optionValueId, productOptionValuesTable.id))
    .innerJoin(productOptionsTable, eq(productOptionValuesTable.optionId, productOptionsTable.id))
    .where(eq(productVariantValuesTable.variantId, variant.id));
  const optionSnapshots = rows.map((r: any) => ({ optionId: r.option.id, optionName: r.option.name, valueId: r.value.id, label: r.value.label, value: r.value.value, colorHex: r.value.colorHex }));
  const label = optionSnapshots.length ? `${product.name} — ${optionSnapshots.map((o: any) => `${o.optionName}: ${o.label}`).join(", ")}` : product.name;
  return { product, variant, imageUrl: variant.imageUrl || product.images?.[0] || null, price: Number(variant.price), comparePrice: variant.comparePrice == null ? null : Number(variant.comparePrice), stock: variant.stock, sku: variant.sku || product.sku, barcode: variant.barcode || product.barcode, label, optionSnapshots };
}

export type CatalogItem = NonNullable<Awaited<ReturnType<typeof resolveCatalogItem>>>;