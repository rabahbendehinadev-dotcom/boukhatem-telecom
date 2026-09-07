import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";

const router: IRouter = Router();

function formatCoupon(c: any) {
  return {
    id: c.id, code: c.code, discountType: c.discountType, discountValue: parseFloat(c.discountValue),
    minOrderAmount: c.minOrderAmount ? parseFloat(c.minOrderAmount) : null,
    maxUses: c.maxUses || null, usageCount: c.usageCount || 0, isActive: c.isActive,
    expiresAt: c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt || null,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

router.get("/coupons", requireAdminSession, requirePermission("manage_coupons"), async (_req, res): Promise<void> => {
  const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
  res.json(coupons.map(formatCoupon));
});

router.post("/coupons", requireAdminSession, requirePermission("manage_coupons"), async (req, res): Promise<void> => {
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
  if (!code || !discountType || discountValue == null) { res.status(400).json({ error: "code, discountType, discountValue requis" }); return; }
  const [coupon] = await db.insert(couponsTable).values({
    code, discountType, discountValue: String(discountValue),
    minOrderAmount: minOrderAmount ? String(minOrderAmount) : null,
    maxUses: maxUses || null, isActive: true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "create_coupon", "coupon", coupon.id, null, { code: coupon.code }, getIp(req));
  res.status(201).json(formatCoupon(coupon));
});

router.patch("/coupons/:id", requireAdminSession, requirePermission("manage_coupons"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  const { code, discountType, discountValue, minOrderAmount, maxUses, isActive, expiresAt } = req.body;
  if (code !== undefined) updates.code = code;
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountValue !== undefined) updates.discountValue = String(discountValue);
  if (minOrderAmount !== undefined) updates.minOrderAmount = minOrderAmount ? String(minOrderAmount) : null;
  if (maxUses !== undefined) updates.maxUses = maxUses;
  if (isActive !== undefined) updates.isActive = isActive;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
  const [coupon] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, id)).returning();
  if (!coupon) { res.status(404).json({ error: "Coupon non trouvé" }); return; }
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_coupon", "coupon", id, null, updates, getIp(req));
  res.json(formatCoupon(coupon));
});

router.delete("/coupons/:id", requireAdminSession, requirePermission("manage_coupons"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(couponsTable).where(eq(couponsTable.id, id));
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "delete_coupon", "coupon", id, null, null, getIp(req));
  res.json({ message: "Coupon supprimé" });
});

export default router;
