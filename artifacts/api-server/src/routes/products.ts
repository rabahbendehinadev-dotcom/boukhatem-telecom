import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, desc, asc, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable, brandsTable } from "@workspace/db";
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
  return formatProduct(p, catName, brandName);
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
  res.json([
    ...products.map((p) => ({ id: p.id, name: p.name, type: "product", imageUrl: p.images?.[0] || null, price: p.price ? parseFloat(p.price) : null })),
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
  if (minPrice) conditions.push(gte(productsTable.price, minPrice));
  if (maxPrice) conditions.push(lte(productsTable.price, maxPrice));
  if (inStock === "true") conditions.push(gte(productsTable.stock, sql`1`));
  if (isNew === "true") conditions.push(eq(productsTable.isNew, true));
  if (hasDiscount === "true") conditions.push(eq(productsTable.hasDiscount, true));
  if (isFeatured === "true") conditions.push(eq(productsTable.isFeatured, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderByClause: any = desc(productsTable.createdAt);
  if (sortBy === "price_asc") orderByClause = asc(productsTable.price);
  else if (sortBy === "price_desc") orderByClause = desc(productsTable.price);
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
  const [product] = await db.insert(productsTable).values({
    name, slug, description, price: String(price), comparePrice: comparePrice ? String(comparePrice) : null,
    stock: stock || 0, sku, barcode, isNew: isNew || false, isFeatured: isFeatured || false,
    hasDiscount: hasDiscount || false, specifications, shippingInfo, warrantyInfo,
    images: images || [], categoryId, brandId
  }).returning();
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
  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Produit non trouvé" }); return; }
  const formatted = await getProductWithNames(product);
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
