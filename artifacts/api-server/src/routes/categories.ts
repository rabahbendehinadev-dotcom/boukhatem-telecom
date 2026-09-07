import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";
import { slugify } from "../lib/slug";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.sortOrder);
  const counts = await db
    .select({ categoryId: productsTable.categoryId, count: sql<number>`count(*)::int` })
    .from(productsTable).groupBy(productsTable.categoryId);
  const countMap = Object.fromEntries(counts.map((c) => [c.categoryId, c.count]));
  res.json(categories.map((c) => ({ ...c, productCount: countMap[c.id] || 0 })));
});

router.post("/categories", requireAdminSession, requirePermission("manage_categories"), async (req, res): Promise<void> => {
  const { name, description, imageUrl, iconName, parentId, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "name requis" }); return; }
  const slug = slugify(name);
  const [cat] = await db.insert(categoriesTable).values({ name, slug, description, imageUrl, iconName, parentId, sortOrder: sortOrder || 0 }).returning();
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "create_category", "category", cat.id, null, { name: cat.name }, getIp(req));
  res.status(201).json({ ...cat, productCount: 0 });
});

router.get("/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!cat) { res.status(404).json({ error: "Catégorie non trouvée" }); return; }
  const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.categoryId, id));
  res.json({ ...cat, productCount: cnt?.count || 0 });
});

router.patch("/categories/:id", requireAdminSession, requirePermission("manage_categories"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, description, imageUrl, iconName, sortOrder } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) { updates.name = name; updates.slug = slugify(name); }
  if (description !== undefined) updates.description = description;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (iconName !== undefined) updates.iconName = iconName;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Catégorie non trouvée" }); return; }
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_category", "category", id, null, updates, getIp(req));
  res.json({ ...cat, productCount: 0 });
});

router.delete("/categories/:id", requireAdminSession, requirePermission("manage_categories"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "delete_category", "category", id, null, null, getIp(req));
  res.json({ message: "Catégorie supprimée" });
});

export default router;
