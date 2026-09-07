import { Router, type IRouter } from "express";
import { eq, desc, asc, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable, brandsTable } from "@workspace/db";

const router: IRouter = Router();

function fmt(p: any, catName?: string | null, brandName?: string | null) {
  const price = parseFloat(p.price);
  const compare = p.comparePrice ? parseFloat(p.comparePrice) : null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price,
    comparePrice: compare,
    discountPercent: compare && compare > price
      ? Math.round((1 - price / compare) * 100)
      : null,
    stock: p.stock,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    hasDiscount: p.hasDiscount,
    averageRating: parseFloat(p.averageRating || "0"),
    reviewCount: p.reviewCount || 0,
    images: (p.images || []).filter((img: string) => img && !img.includes("placehold.co")),
    categoryId: p.categoryId,
    categoryName: catName || null,
    brandId: p.brandId,
    brandName: brandName || null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/homepage", async (_req, res): Promise<void> => {
  try {
    // ── 1. Lookup tables (single query each) ──────────────────────────────
    const [allBrands, allCategories, productCountsRaw] = await Promise.all([
      db.select({ id: brandsTable.id, name: brandsTable.name }).from(brandsTable),
      db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id)),
      db.select({
        categoryId: productsTable.categoryId,
        count: sql<number>`count(*)::int`,
      }).from(productsTable).groupBy(productsTable.categoryId),
    ]);

    const brandMap = new Map<number, string>(allBrands.map(b => [b.id, b.name]));
    const catMap   = new Map<number, typeof allCategories[0]>(allCategories.map(c => [c.id, c]));
    const countMap = new Map<number | null, number>(productCountsRaw.map(r => [r.categoryId, r.count]));

    const usedIds = new Set<number>();

    // ── 2. Sélection Pro — isFeatured = true, max 4 ──────────────────────
    const featuredRaw = await db.select().from(productsTable)
      .where(eq(productsTable.isFeatured, true))
      .orderBy(desc(productsTable.createdAt))
      .limit(4);

    const featuredProducts = featuredRaw.map(p =>
      fmt(p, catMap.get(p.categoryId ?? 0)?.name, brandMap.get(p.brandId ?? 0))
    );
    featuredProducts.forEach(p => usedIds.add(p.id));

    // ── 3. Nouveaux Arrivages — isNew = true, createdAt DESC, exclude used ─
    const newRaw = await db.select().from(productsTable)
      .where(eq(productsTable.isNew, true))
      .orderBy(desc(productsTable.createdAt))
      .limit(20);

    const newProducts = newRaw
      .filter(p => !usedIds.has(p.id))
      .slice(0, 4)
      .map(p => fmt(p, catMap.get(p.categoryId ?? 0)?.name, brandMap.get(p.brandId ?? 0)));
    newProducts.forEach(p => usedIds.add(p.id));

    // ── 4. Promotions — hasDiscount = true, exclude used ─────────────────
    const promoRaw = await db.select().from(productsTable)
      .where(eq(productsTable.hasDiscount, true))
      .orderBy(desc(productsTable.createdAt))
      .limit(20);

    const promotionalProducts = promoRaw
      .filter(p => !usedIds.has(p.id))
      .slice(0, 4)
      .map(p => fmt(p, catMap.get(p.categoryId ?? 0)?.name, brandMap.get(p.brandId ?? 0)));

    // ── 5. Catégories Populaires — has products, max 6 ───────────────────
    const popularCategories = allCategories
      .filter(c => (countMap.get(c.id) ?? 0) > 0)
      .sort((a, b) =>
        (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0) ||
        a.sortOrder - b.sortOrder
      )
      .slice(0, 6)
      .map(c => ({ ...c, productCount: countMap.get(c.id) ?? 0 }));

    // ── Sanity check: no duplicate IDs across product sections ────────────
    const allProductIds = [
      ...featuredProducts,
      ...newProducts,
      ...promotionalProducts,
    ].map(p => p.id);
    const uniqueCount = new Set(allProductIds).size;
    if (uniqueCount !== allProductIds.length) {
      console.warn("[homepage] duplicate product IDs detected — this should not happen");
    }

    res.json({ featuredProducts, newProducts, promotionalProducts, popularCategories });
  } catch (err: any) {
    console.error("[homepage]", err?.message ?? err);
    res.status(500).json({ error: "Erreur lors du chargement de la page d'accueil" });
  }
});

export default router;
