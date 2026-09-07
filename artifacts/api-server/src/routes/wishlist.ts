import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, wishlistTable, productsTable, categoriesTable, brandsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatProduct(p: any, catName?: string | null, brandName?: string | null) {
  return {
    id: p.id, name: p.name, slug: p.slug, price: parseFloat(p.price),
    comparePrice: p.comparePrice ? parseFloat(p.comparePrice) : null,
    discountPercent: p.comparePrice ? Math.round((1 - parseFloat(p.price) / parseFloat(p.comparePrice)) * 100) : null,
    stock: p.stock, sku: p.sku, isNew: p.isNew, isFeatured: p.isFeatured, hasDiscount: p.hasDiscount,
    averageRating: parseFloat(p.averageRating || "0"), reviewCount: p.reviewCount || 0,
    images: p.images || [], categoryId: p.categoryId, categoryName: catName || null,
    brandId: p.brandId, brandName: brandName || null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/wishlist", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const items = await db.select({ product: productsTable }).from(wishlistTable)
    .leftJoin(productsTable, eq(wishlistTable.productId, productsTable.id))
    .where(eq(wishlistTable.userId, userId));
  const result = await Promise.all(items.filter((i) => i.product).map(async (i) => {
    const p = i.product!;
    let catName: string | null = null, brandName: string | null = null;
    if (p.categoryId) { const [c] = await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, p.categoryId)); catName = c?.name || null; }
    if (p.brandId) { const [b] = await db.select({ name: brandsTable.name }).from(brandsTable).where(eq(brandsTable.id, p.brandId)); brandName = b?.name || null; }
    return formatProduct(p, catName, brandName);
  }));
  res.json(result);
});

router.post("/wishlist/:productId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const productId = parseInt(req.params.productId as string, 10);
  await db.insert(wishlistTable).values({ userId, productId }).onConflictDoNothing();
  res.json({ message: "Ajouté aux favoris" });
});

router.delete("/wishlist/:productId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const productId = parseInt(req.params.productId as string, 10);
  await db.delete(wishlistTable).where(and(eq(wishlistTable.userId, userId), eq(wishlistTable.productId, productId)));
  res.json({ message: "Retiré des favoris" });
});

export default router;
