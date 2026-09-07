import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows.length > 0) return rows[0];
  const [s] = await db.insert(settingsTable).values({ storeName: "BOUKHATEM TELECOM", shippingCost: "500" }).returning();
  return s;
}

function formatSettings(s: any) {
  return {
    storeName: s.storeName, logoUrl: s.logoUrl || null, faviconUrl: s.faviconUrl || null,
    phone: s.phone || null, email: s.email || null, address: s.address || null,
    facebook: s.facebook || null, instagram: s.instagram || null, whatsapp: s.whatsapp || null,
    metaTitle: s.metaTitle || null, metaDescription: s.metaDescription || null,
    shippingCost: parseFloat(s.shippingCost ?? "500"),
    freeShippingThreshold: s.freeShippingThreshold ? parseFloat(s.freeShippingThreshold) : null,
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(formatSettings(settings));
});

router.patch("/settings", requireAdminSession, requirePermission("manage_settings"), async (req, res): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    const updates: Record<string, unknown> = {};
    const fields = ["storeName", "logoUrl", "faviconUrl", "phone", "email", "address", "facebook", "instagram", "whatsapp", "metaTitle", "metaDescription"];
    for (const f of fields) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
    if (req.body.shippingCost !== undefined) updates.shippingCost = String(req.body.shippingCost);
    if (req.body.freeShippingThreshold !== undefined) updates.freeShippingThreshold = req.body.freeShippingThreshold ? String(req.body.freeShippingThreshold) : null;
    const [s] = await db.update(settingsTable).set(updates).where(eq(settingsTable.id, settings.id)).returning();
    // logActivity is best-effort — don't let it block the response
    logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_settings", "settings", settings.id, null, updates, getIp(req))
      .catch((err) => logger.error({ err }, "logActivity failed for update_settings"));
    res.json(formatSettings(s || settings));
  } catch (err: any) {
    logger.error({ err: err?.message ?? err, code: err?.code }, "PATCH /settings failed");
    res.status(500).json({ error: "Erreur lors de la mise à jour des paramètres", detail: err?.message });
  }
});

export default router;
