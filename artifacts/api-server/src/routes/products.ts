import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, desc, asc, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable, brandsTable, productOptionsTable, productOptionValuesTable, productVariantsTable, productVariantValuesTable } from "@workspace/db";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";
import { slugify } from "../lib/slug";

const router: IRouter = Router();

function formatProduct(p: any, catName?: string | null, brandName?: string | null) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: parseFloat(p.price),
    comparePrice: p.comparePrice ? parseFloat(p.comparePrice) : null,
    discountPercent: p.comparePrice ? Math.round((1 - parseFloat(p.price) / parseFloat(p.comparePrice)) * 100) : null,
    stock: p.stock,
    sku: p.sku,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    hasDiscount: p.hasDiscount,
    averageRating: parseFloat(p.averageRating || "0"),
    reviewCount: p.reviewCount || 0,
    images: p.images || [],
    categoryId: p.categoryId,
    categoryName: catName || null,
    brandId: p.brandId,
    brandName: brandName || null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

async function getVariantData(productId: number) {
  const options = await db.select().from(productOptionsTable)
    .where(eq(productOptionsTable.productId, productId)).orderBy(asc(productOptionsTable.position), asc(productOptionsTable.id));
  const values = options.length
    ? await db.select().from(productOptionValuesTable).where(sql`${productOptionValuesTable.optionId} IN (${sql.join(options.map((o) => sql`${o.id}`), sql`, `)})`).orderBy(asc(productOptionValuesTable.position), asc(productOptionValuesTable.id))
    : [];
  const variants = await db.select().from(productVariantsTable)
    .where(eq(productVariantsTable.productId, productId)).orderBy(asc(productVariantsTable.id));
  const joins = variants.length
    ? await db.select().from(productVariantValuesTable).where(sql`${productVariantValuesTable.variantId} IN (${sql.join(variants.map((v) => sql`${v.id}`), sql`, `)})`)
    : [];
  const valueMap = new Map(values.map((v) => [v.id, v]));
  const optionMap = new Map(options.map((o) => [o.id, o]));
  return {
    options: options.map((o) => ({ id: o.id, name: o.name, position: o.position, values: values.filter((v) => v.optionId === o.id).map((v) => ({ id: v.id, label: v.label, value: v.value, colorHex: v.colorHex, position: v.position })) })),
    variants: variants.map((v) => ({
      id: v.id, price: Number(v.price), comparePrice: v.comparePrice == null ? null : Number(v.comparePrice),
      stock: v.stock, sku: v.sku, barcode: v.barcode, imageUrl: v.imageUrl, isActive: v.isActive,
      optionValueIds: joins.filter((j) => j.variantId === v.id).map((j) => j.optionValueId),
      options: joins.filter((j) => j.variantId === v.id).map((j) => {
        const value = valueMap.get(j.optionValueId); const option = value ? optionMap.get(value.optionId) : undefined;
        return value && option ? { optionId: option.id, optionName: option.name, valueId: value.id, label: value.label, value: value.value, colorHex: value.colorHex } : null;
      }).filter(Boolean),
    })),
  };
}

async function replaceVariantStructure(tx: any, productId: number, input: any) {
  if (!input || (!Array.isArray(input.options) && !Array.isArray(input.variants))) return;
  const optionsInput = input.options || [];
  const variantsInput = input.variants || [];
  if (variantsInput.length && !optionsInput.length) throw new Error("Chaque variante doit avoir au moins une option.");
  const valueIds = new Map<string, number>();
  const valueOption = new Map<number, number>();
  const optionNames = new Set<string>();
  for (const [optionIndex, option] of optionsInput.entries()) {
    const name = String(option.name || "").trim();
    if (!name || optionNames.has(name)) throw new Error("Les noms d'options doivent être uniques.");
    optionNames.add(name);
    const seenValues = new Set<string>();
    for (const [valueIndex, value] of (option.values || []).entries()) {
      const key = String(value.value ?? value.label ?? "").trim();
      if (!key || seenValues.has(key)) throw new Error(`Valeur d'option dupliquée: ${key}`);
      seenValues.add(key);
      // IDs in the request are only local references to values in this same payload.
      if (value.id != null) valueIds.set(String(value.id), -1);
      valueIds.set(`${optionIndex}:${valueIndex}`, -1);
    }
  }
  const signatures = new Set<string>();
  await tx.delete(productVariantsTable).where(eq(productVariantsTable.productId, productId));
  await tx.delete(productOptionsTable).where(eq(productOptionsTable.productId, productId));
  for (const [optionIndex, option] of optionsInput.entries()) {
    const [created] = await tx.insert(productOptionsTable).values({ productId, name: String(option.name), position: option.position ?? optionIndex }).returning();
    for (const [valueIndex, value] of (option.values || []).entries()) {
      const [createdValue] = await tx.insert(productOptionValuesTable).values({
        optionId: created.id, productId, label: String(value.label ?? value.value), value: String(value.value ?? value.label),
        colorHex: value.colorHex ?? null, position: value.position ?? valueIndex,
      }).returning();
      valueIds.set(`${optionIndex}:${valueIndex}`, createdValue.id);
      if (value.id != null) valueIds.set(String(value.id), createdValue.id);
      valueOption.set(createdValue.id, created.id);
    }
  }
  for (const variant of variantsInput) {
    const rawIds = variant.optionValueIds || [];
    if (!Array.isArray(rawIds) || rawIds.length !== optionsInput.length) throw new Error("Chaque combinaison doit contenir une valeur par option.");
    const ids = rawIds.map((id: any) => valueIds.get(String(id))).filter((id: any) => id != null && id > 0);
    if (ids.length !== rawIds.length || new Set(ids).size !== ids.length || new Set(ids.map((id: number) => valueOption.get(id))).size !== ids.length) {
      throw new Error("Une combinaison contient une valeur étrangère, dupliquée ou deux valeurs de la même option.");
    }
    const signature = [...ids].sort((a: number, b: number) => a - b).join(",");
    if (signatures.has(signature)) throw new Error("Les combinaisons de variantes doivent être uniques.");
    signatures.add(signature);
    if (!Number.isFinite(Number(variant.price)) || !Number.isFinite(Number(variant.stock ?? 0)) || Number(variant.price) < 0 || Number(variant.stock ?? 0) < 0) throw new Error("Le prix et le stock doivent être positifs.");
    const [created] = await tx.insert(productVariantsTable).values({
      productId, price: String(variant.price), comparePrice: variant.comparePrice == null ? null : String(variant.comparePrice),
      stock: Number(variant.stock ?? 0), sku: variant.sku ?? null, barcode: variant.barcode ?? null,
      imageUrl: variant.imageUrl ?? null, isActive: variant.isActive !== false, optionSignature: signature,
    }).returning();
    await tx.insert(productVariantValuesTable).values(ids.map((optionValueId: number) => ({ variantId: created.id, optionValueId, productId })));
  }
}

async function getProductWithNames(p: any) {
  let catName: string | null = null;
  let brandName: string | null = null;
  if (p.categoryId) {
    const [c] = await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, p.categoryId));
    catName = c?.name || null;
  }
  if (p.brandId) {
    const [b] = await db.select({ name: brandsTable.name }).from(brandsTable).where(eq(brandsTable.id, p.brandId));
    brandName = b?.name || null;
  }
  const variantData = await getVariantData(p.id);
  const active = variantData.variants.filter((v) => v.isActive);
  const available = active.filter((v) => v.stock > 0);
  return { ...formatProduct(p, catName, brandName), options: variantData.options, variants: variantData.variants, variantSummary: {
    hasVariants: variantData.variants.length > 0,
    lowestPrice: available.length ? Math.min(...available.map((v) => v.price)) : null,
    lowestComparePrice: available.length ? Math.min(...available.map((v) => v.comparePrice ?? v.price)) : null,
    totalStock: active.reduce((sum, v) => sum + v.stock, 0),
    inStock: available.length > 0,
  } };
}

router.get("/products/featured", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.isFeatured, true)).limit(10);
  const result = await Promise.all(products.map(getProductWithNames));
  res.json(result);
});

router.get("/products/new-arrivals", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.isNew, true)).orderBy(desc(productsTable.createdAt)).limit(10);
  const result = await Promise.all(products.map(getProductWithNames));
  res.json(result);
});

router.get("/products/promotions", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.hasDiscount, true)).limit(10);
  const result = await Promise.all(products.map(getProductWithNames));
  res.json(result);
});

router.get("/products/search-suggestions", async (req, res): Promise<void> => {
  const q = req.query.q as string;
  if (!q) { res.json([]); return; }
  const products = await db.select({ id: productsTable.id, name: productsTable.name, images: productsTable.images, price: productsTable.price })
    .from(productsTable).where(ilike(productsTable.name, `%${q}%`)).limit(5);
  const categories = await db.select({ id: categoriesTable.id, name: categoriesTable.name })
    .from(categoriesTable).where(ilike(categoriesTable.name, `%${q}%`)).limit(3);
  const brands = await db.select({ id: brandsTable.id, name: brandsTable.name })
    .from(brandsTable).where(ilike(brandsTable.name, `%${q}%`)).limit(2);
  const productSuggestions = await Promise.all(products.map(async (p) => {
    const variants = await db.select().from(productVariantsTable).where(and(eq(productVariantsTable.productId, p.id), eq(productVariantsTable.isActive, true), gte(productVariantsTable.stock, 1))).orderBy(asc(productVariantsTable.price)).limit(1);
    const [hasVariant] = await db.select({ id: productVariantsTable.id }).from(productVariantsTable).where(eq(productVariantsTable.productId, p.id)).limit(1);
    return { id: p.id, name: p.name, type: "product", imageUrl: p.images?.[0] || null, price: variants[0] ? Number(variants[0].price) : (hasVariant ? null : (p.price ? parseFloat(p.price) : null)) };
  }));
  res.json([
    ...productSuggestions,
    ...categories.map((c) => ({ id: c.id, name: c.name, type: "category", imageUrl: null, price: null })),
    ...brands.map((b) => ({ id: b.id, name: b.name, type: "brand", imageUrl: null, price: null })),
  ]);
});

router.get("/products", async (req, res): Promise<void> => {
  const { page = "1", limit = "12", categoryId, brandId, search, minPrice, maxPrice, inStock, isNew, hasDiscount, isFeatured, sortBy } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  const parsedCatId = parseInt(categoryId, 10);
  const parsedBrandId = parseInt(brandId, 10);
  if (categoryId && !isNaN(parsedCatId)) conditions.push(eq(productsTable.categoryId, parsedCatId));
  if (brandId && !isNaN(parsedBrandId)) conditions.push(eq(productsTable.brandId, parsedBrandId));
  if (search && search !== 'null') conditions.push(ilike(productsTable.name, `%${search}%`));
  const effectivePrice = sql`CASE WHEN EXISTS (SELECT 1 FROM product_variants ve WHERE ve.product_id = ${productsTable.id}) THEN (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = ${productsTable.id} AND v.is_active = true AND v.stock > 0) ELSE ${productsTable.price} END`;
  if (minPrice) conditions.push(gte(effectivePrice, minPrice));
  if (maxPrice) conditions.push(lte(effectivePrice, maxPrice));
  if (inStock === "true") conditions.push(sql`((${productsTable.stock} > 0 AND NOT EXISTS (SELECT 1 FROM product_variants v0 WHERE v0.product_id = ${productsTable.id})) OR EXISTS (SELECT 1 FROM product_variants v1 WHERE v1.product_id = ${productsTable.id} AND v1.is_active = true AND v1.stock > 0))`);
  if (isNew === "true") conditions.push(eq(productsTable.isNew, true));
  if (hasDiscount === "true") conditions.push(eq(productsTable.hasDiscount, true));
  if (isFeatured === "true") conditions.push(eq(productsTable.isFeatured, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderByClause: any = desc(productsTable.createdAt);
  if (sortBy === "price_asc") orderByClause = asc(effectivePrice);
  else if (sortBy === "price_desc") orderByClause = desc(effectivePrice);
  else if (sortBy === "newest") orderByClause = desc(productsTable.createdAt);
  else if (sortBy === "rating") orderByClause = desc(productsTable.averageRating);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(whereClause);
  const products = await db.select().from(productsTable).where(whereClause).orderBy(orderByClause).limit(limitNum).offset(offset);
  const result = await Promise.all(products.map(getProductWithNames));
  res.json({ products: result, total: count, page: pageNum, totalPages: Math.ceil(count / limitNum) });
});

router.post("/products", requireAdminSession, requirePermission("manage_products"), async (req, res): Promise<void> => {
  const { name, description, price, comparePrice, stock, sku, barcode, isNew, isFeatured, hasDiscount, specifications, shippingInfo, warrantyInfo, images, categoryId, brandId } = req.body;
  if (!name || price == null) { res.status(400).json({ error: "name et price requis" }); return; }
  const slug = slugify(name);
  let product: any;
  try {
    [product] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(productsTable).values({
        name, slug, description, price: String(price), comparePrice: comparePrice ? String(comparePrice) : null,
        stock: stock || 0, sku, barcode, isNew: isNew || false, isFeatured: isFeatured || false,
        hasDiscount: hasDiscount || false, specifications, shippingInfo, warrantyInfo,
        images: images || [], categoryId, brandId
      }).returning();
      await replaceVariantStructure(tx, created.id, req.body);
      return [created];
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Structure de variantes invalide" }); return;
  }
  const formatted = await getProductWithNames(product);
  res.status(201).json(formatted);
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Produit non trouvé" }); return; }
  let catName: string | null = null;
  let brandName: string | null = null;
  if (product.categoryId) {
    const [c] = await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));
    catName = c?.name || null;
  }
  if (product.brandId) {
    const [b] = await db.select({ name: brandsTable.name }).from(brandsTable).where(eq(brandsTable.id, product.brandId));
    brandName = b?.name || null;
  }
  res.json({
    ...formatProduct(product, catName, brandName),
    description: product.description,
    specifications: product.specifications || {},
    shippingInfo: product.shippingInfo,
    warrantyInfo: product.warrantyInfo,
    barcode: product.barcode,
    ...(await getVariantData(product.id)),
  });
});

router.patch("/products/:id", requireAdminSession, requirePermission("manage_products"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  const fields = ["name", "description", "price", "comparePrice", "stock", "sku", "isNew", "isFeatured", "hasDiscount", "specifications", "shippingInfo", "warrantyInfo", "images", "categoryId", "brandId"];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if (f === "price" || f === "comparePrice") updates[f] = req.body[f] ? String(req.body[f]) : null;
      else updates[f] = req.body[f];
    }
  }
  if (req.body.name) updates.slug = slugify(req.body.name);
  let product: any;
  try {
    [product] = await db.transaction(async (tx) => {
      const [updated] = await tx.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
      if (updated) await replaceVariantStructure(tx, id, req.body);
      return [updated];
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Structure de variantes invalide" }); return;
  }
  if (!product) { res.status(404).json({ error: "Produit non trouvé" }); return; }
  const formatted = { ...(await getProductWithNames(product)), ...(await getVariantData(id)) };
  res.json(formatted);
});

router.delete("/products/:id", requireAdminSession, requirePermission("manage_products"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ message: "Produit supprimé" });
});

router.get("/products/:id/related", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [product] = await db.select({ categoryId: productsTable.categoryId }).from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.json([]); return; }
  const related = await db.select().from(productsTable)
    .where(and(product.categoryId ? eq(productsTable.categoryId, product.categoryId) : undefined, sql`${productsTable.id} != ${id}`))
    .limit(6);
  const result = await Promise.all(related.map(getProductWithNames));
  res.json(result);
});

export default router;
