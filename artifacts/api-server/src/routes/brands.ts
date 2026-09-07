import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, brandsTable, productsTable } from "@workspace/db";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";
import { slugify } from "../lib/slug";

const router: IRouter = Router();

router.get("/brands", async (_req, res): Promise<void> => {
  const brands = await db.select().from(brandsTable).orderBy(brandsTable.sortOrder);
  const counts = await db
    .select({ brandId: productsTable.brandId, count: sql<number>`count(*)::int` })
    .from(productsTable).groupBy(productsTable.brandId);
  const countMap = Object.fromEntries(counts.map((c) => [c.brandId, c.count]));
  res.json(brands.map((b) => ({ ...b, productCount: countMap[b.id] || 0 })));
});

router.post("/brands", requireAdminSession, requirePermission("manage_brands"), async (req, res): Promise<void> => {
  const { name, description, logoUrl, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "name requis" }); return; }
  const slug = slugify(name);
  const [brand] = await db.insert(brandsTable).values({ name, slug, description, logoUrl, sortOrder: sortOrder || 0 }).returning();
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "create_brand", "brand", brand.id, null, { name: brand.name }, getIp(req));
  res.status(201).json({ ...brand, productCount: 0 });
});

router.patch("/brands/:id", requireAdminSession, requirePermission("manage_brands"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, description, logoUrl, sortOrder } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) { updates.name = name; updates.slug = slugify(name); }
  if (description !== undefined) updates.description = description;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [brand] = await db.update(brandsTable).set(updates).where(eq(brandsTable.id, id)).returning();
  if (!brand) { res.status(404).json({ error: "Marque non trouvée" }); return; }
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_brand", "brand", id, null, updates, getIp(req));
  res.json({ ...brand, productCount: 0 });
});

router.delete("/brands/:id", requireAdminSession, requirePermission("manage_brands"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(brandsTable).where(eq(brandsTable.id, id));
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "delete_brand", "brand", id, null, null, getIp(req));
  res.json({ message: "Marque supprimée" });
});

export default router;
