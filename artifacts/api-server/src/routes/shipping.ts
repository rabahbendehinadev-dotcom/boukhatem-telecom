import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, shippingRatesTable } from "@workspace/db";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";

const router: IRouter = Router();

// ══════════════════════════════════════════════════════════════
// PUBLIC — used by the storefront checkout
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/shipping-rates/active
 * Returns all active wilayas with their delivery options and prices.
 * Used by checkout to populate the wilaya dropdown.
 */
router.get("/shipping-rates/active", async (_req, res): Promise<void> => {
  const rates = await db
    .select()
    .from(shippingRatesTable)
    .where(eq(shippingRatesTable.isActive, true))
    .orderBy(asc(shippingRatesTable.wilayaCode));
  res.json({ wilayas: rates });
});

/**
 * GET /api/shipping-rates/:wilayaCode
 * Returns rate details for a single active wilaya.
 * Returns 404 if the wilaya doesn't exist or is inactive.
 */
router.get("/shipping-rates/:wilayaCode", async (req, res): Promise<void> => {
  const code = (req.params.wilayaCode as string).padStart(2, "0");
  const [rate] = await db
    .select()
    .from(shippingRatesTable)
    .where(eq(shippingRatesTable.wilayaCode, code));
  if (!rate) { res.status(404).json({ error: "Wilaya non trouvée" }); return; }
  if (!rate.isActive) { res.status(404).json({ error: "Livraison non disponible pour cette wilaya" }); return; }
  res.json({
    wilayaCode: rate.wilayaCode,
    wilayaName: rate.wilayaName,
    homeDeliveryEnabled: rate.homeDeliveryEnabled,
    homeDeliveryPrice: rate.homeDeliveryPrice,
    officeDeliveryEnabled: rate.officeDeliveryEnabled,
    officeDeliveryPrice: rate.officeDeliveryPrice,
    minDeliveryDays: rate.minDeliveryDays,
    maxDeliveryDays: rate.maxDeliveryDays,
  });
});

// Legacy compat aliases (kept so old cached pages don't 404)
router.get("/shipping/wilayas", async (_req, res): Promise<void> => {
  const rates = await db
    .select()
    .from(shippingRatesTable)
    .where(eq(shippingRatesTable.isActive, true))
    .orderBy(asc(shippingRatesTable.wilayaCode));
  res.json({ wilayas: rates });
});

router.get("/shipping/wilayas/:code", async (req, res): Promise<void> => {
  const code = (req.params.code as string).padStart(2, "0");
  const [rate] = await db
    .select()
    .from(shippingRatesTable)
    .where(and(eq(shippingRatesTable.wilayaCode, code), eq(shippingRatesTable.isActive, true)));
  if (!rate) { res.status(404).json({ error: "Wilaya non trouvée" }); return; }
  res.json(rate);
});

// ══════════════════════════════════════════════════════════════
// ADMIN — requires manage_shipping_rates permission
// ══════════════════════════════════════════════════════════════

const guard = [requireAdminSession, requirePermission("manage_shipping_rates")] as const;

/** GET /api/admin/shipping-rates — all 58 wilaya rates */
router.get("/admin/shipping-rates", ...guard, async (_req, res): Promise<void> => {
  const rates = await db
    .select()
    .from(shippingRatesTable)
    .orderBy(asc(shippingRatesTable.wilayaCode));
  res.json({ rates });
});

/** PATCH /api/admin/shipping-rates/:wilayaCode — update one rate */
router.patch("/admin/shipping-rates/:wilayaCode", ...guard, async (req, res): Promise<void> => {
  const code = (req.params.wilayaCode as string).padStart(2, "0");
  const {
    isActive, homeDeliveryEnabled, officeDeliveryEnabled,
    homeDeliveryPrice, officeDeliveryPrice, minDeliveryDays, maxDeliveryDays,
  } = req.body as Record<string, any>;

  // Validation
  if (homeDeliveryEnabled && (homeDeliveryPrice == null || Number(homeDeliveryPrice) < 0)) {
    res.status(400).json({ error: "Prix domicile invalide (doit être ≥ 0)" }); return;
  }
  if (officeDeliveryEnabled && (officeDeliveryPrice == null || Number(officeDeliveryPrice) < 0)) {
    res.status(400).json({ error: "Prix bureau invalide (doit être ≥ 0)" }); return;
  }
  if (Number(minDeliveryDays) > Number(maxDeliveryDays)) {
    res.status(400).json({ error: "Délai minimum ne peut pas être supérieur au délai maximum" }); return;
  }

  const updates = {
    isActive: Boolean(isActive),
    homeDeliveryEnabled: Boolean(homeDeliveryEnabled),
    officeDeliveryEnabled: Boolean(officeDeliveryEnabled),
    homeDeliveryPrice: Math.round(Number(homeDeliveryPrice)),
    officeDeliveryPrice: Math.round(Number(officeDeliveryPrice)),
    minDeliveryDays: Math.round(Number(minDeliveryDays)) || 1,
    maxDeliveryDays: Math.round(Number(maxDeliveryDays)) || 3,
  };

  const [rate] = await db
    .update(shippingRatesTable)
    .set(updates)
    .where(eq(shippingRatesTable.wilayaCode, code))
    .returning();
  if (!rate) { res.status(404).json({ error: "Wilaya non trouvée" }); return; }
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_shipping_rate", "shipping_rate", 0, { code }, updates, getIp(req));
  res.json(rate);
});

/** PUT /api/admin/shipping-rates/:wilayaCode — kept for compat with admin page */
router.put("/admin/shipping-rates/:wilayaCode", ...guard, async (req, res): Promise<void> => {
  const code = (req.params.wilayaCode as string).padStart(2, "0");
  const {
    isActive, homeDeliveryEnabled, officeDeliveryEnabled,
    homeDeliveryPrice, officeDeliveryPrice, minDeliveryDays, maxDeliveryDays,
  } = req.body as Record<string, any>;

  if (homeDeliveryEnabled && (homeDeliveryPrice == null || Number(homeDeliveryPrice) < 0)) {
    res.status(400).json({ error: "Prix domicile invalide (doit être ≥ 0)" }); return;
  }
  if (officeDeliveryEnabled && (officeDeliveryPrice == null || Number(officeDeliveryPrice) < 0)) {
    res.status(400).json({ error: "Prix bureau invalide (doit être ≥ 0)" }); return;
  }
  if (Number(minDeliveryDays) > Number(maxDeliveryDays)) {
    res.status(400).json({ error: "Délai minimum ne peut pas être supérieur au délai maximum" }); return;
  }

  const updates = {
    isActive: Boolean(isActive),
    homeDeliveryEnabled: Boolean(homeDeliveryEnabled),
    officeDeliveryEnabled: Boolean(officeDeliveryEnabled),
    homeDeliveryPrice: Math.round(Number(homeDeliveryPrice)),
    officeDeliveryPrice: Math.round(Number(officeDeliveryPrice)),
    minDeliveryDays: Math.round(Number(minDeliveryDays)) || 1,
    maxDeliveryDays: Math.round(Number(maxDeliveryDays)) || 3,
  };

  const [rate] = await db
    .update(shippingRatesTable)
    .set(updates)
    .where(eq(shippingRatesTable.wilayaCode, code))
    .returning();
  if (!rate) { res.status(404).json({ error: "Wilaya non trouvée" }); return; }
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_shipping_rate", "shipping_rate", 0, { code }, updates, getIp(req));
  res.json(rate);
});

/** POST /api/admin/shipping-rates/bulk — bulk action on multiple wilayas */
router.post("/admin/shipping-rates/bulk", ...guard, async (req, res): Promise<void> => {
  const { action, wilayaCodes, value } = req.body as { action: string; wilayaCodes: string[]; value?: any };
  if (!Array.isArray(wilayaCodes) || wilayaCodes.length === 0) {
    res.status(400).json({ error: "wilayaCodes requis" }); return;
  }
  if (!action) { res.status(400).json({ error: "action requise" }); return; }

  let updatedCount = 0;

  for (const code of wilayaCodes) {
    const paddedCode = code.padStart(2, "0");
    let updates: Record<string, any> = {};

    if (action === "activate")        updates = { isActive: true };
    else if (action === "deactivate") updates = { isActive: false };
    else if (action === "enable_home")    updates = { homeDeliveryEnabled: true };
    else if (action === "enable_office" || action === "enable_desk")
      updates = { officeDeliveryEnabled: true };
    else if (action === "set_home_price") {
      const price = Math.round(Number(value));
      if (isNaN(price) || price < 0) continue;
      updates = { homeDeliveryPrice: price };
    }
    else if (action === "set_office_price" || action === "set_desk_price") {
      const price = Math.round(Number(value));
      if (isNaN(price) || price < 0) continue;
      updates = { officeDeliveryPrice: price };
    }
    else if (action === "set_min_days") {
      const days = Math.round(Number(value));
      if (isNaN(days) || days < 1) continue;
      updates = { minDeliveryDays: days };
    }
    else if (action === "set_max_days") {
      const days = Math.round(Number(value));
      if (isNaN(days) || days < 1) continue;
      updates = { maxDeliveryDays: days };
    }
    else if (action === "percent_change") {
      const pct = Number(value);
      if (isNaN(pct)) continue;
      const [existing] = await db
        .select({ h: shippingRatesTable.homeDeliveryPrice, o: shippingRatesTable.officeDeliveryPrice })
        .from(shippingRatesTable)
        .where(eq(shippingRatesTable.wilayaCode, paddedCode));
      if (!existing) continue;
      updates = {
        homeDeliveryPrice:   Math.max(0, Math.round(existing.h * (1 + pct / 100))),
        officeDeliveryPrice: Math.max(0, Math.round(existing.o * (1 + pct / 100))),
      };
    }
    else if (action === "update_many") {
      const {
        isActive, homeDeliveryEnabled, officeDeliveryEnabled,
        homeDeliveryPrice, officeDeliveryPrice, minDeliveryDays, maxDeliveryDays,
      } = value ?? {};
      updates = { isActive, homeDeliveryEnabled, officeDeliveryEnabled, homeDeliveryPrice, officeDeliveryPrice, minDeliveryDays, maxDeliveryDays };
    }
    else continue;

    if (Object.keys(updates).length === 0) continue;
    const result = await db
      .update(shippingRatesTable)
      .set(updates)
      .where(eq(shippingRatesTable.wilayaCode, paddedCode))
      .returning({ id: shippingRatesTable.id });
    if (result.length > 0) updatedCount++;
  }

  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "bulk_update_shipping_rates", "shipping_rate", 0, { action, count: wilayaCodes.length }, { updatedCount }, getIp(req));
  res.json({ updated: updatedCount });
});

/** POST /api/admin/shipping-rates/seed  — ensure all 58 wilayas exist */
/** POST /api/admin/shipping-rates/initialize — alias per spec */
const SEED: Array<{ code: string; name: string; home: number; office: number; min: number; max: number }> = [
  { code: "01", name: "Adrar",                home: 1000, office: 750, min: 4, max: 7 },
  { code: "02", name: "Chlef",                home: 650,  office: 450, min: 2, max: 3 },
  { code: "03", name: "Laghouat",             home: 800,  office: 600, min: 3, max: 5 },
  { code: "04", name: "Oum El Bouaghi",       home: 650,  office: 450, min: 2, max: 3 },
  { code: "05", name: "Batna",                home: 650,  office: 450, min: 2, max: 3 },
  { code: "06", name: "Béjaïa",              home: 600,  office: 400, min: 1, max: 2 },
  { code: "07", name: "Biskra",               home: 800,  office: 600, min: 3, max: 5 },
  { code: "08", name: "Béchar",              home: 1000, office: 750, min: 4, max: 7 },
  { code: "09", name: "Blida",                home: 500,  office: 350, min: 1, max: 2 },
  { code: "10", name: "Bouira",               home: 650,  office: 450, min: 2, max: 3 },
  { code: "11", name: "Tamanrasset",          home: 800,  office: 600, min: 3, max: 5 },
  { code: "12", name: "Tébessa",             home: 650,  office: 450, min: 2, max: 3 },
  { code: "13", name: "Tlemcen",              home: 600,  office: 400, min: 1, max: 2 },
  { code: "14", name: "Tiaret",               home: 650,  office: 450, min: 2, max: 3 },
  { code: "15", name: "Tizi Ouzou",           home: 600,  office: 400, min: 1, max: 2 },
  { code: "16", name: "Alger",                home: 500,  office: 350, min: 1, max: 2 },
  { code: "17", name: "Djelfa",               home: 800,  office: 600, min: 3, max: 5 },
  { code: "18", name: "Jijel",                home: 650,  office: 450, min: 2, max: 3 },
  { code: "19", name: "Sétif",               home: 600,  office: 400, min: 1, max: 2 },
  { code: "20", name: "Saïda",              home: 650,  office: 450, min: 2, max: 3 },
  { code: "21", name: "Skikda",               home: 600,  office: 400, min: 1, max: 2 },
  { code: "22", name: "Sidi Bel Abbès",      home: 600,  office: 400, min: 1, max: 2 },
  { code: "23", name: "Annaba",               home: 600,  office: 400, min: 1, max: 2 },
  { code: "24", name: "Guelma",               home: 650,  office: 450, min: 2, max: 3 },
  { code: "25", name: "Constantine",          home: 600,  office: 400, min: 1, max: 2 },
  { code: "26", name: "Médéa",              home: 650,  office: 450, min: 2, max: 3 },
  { code: "27", name: "Mostaganem",           home: 650,  office: 450, min: 2, max: 3 },
  { code: "28", name: "M'Sila",              home: 800,  office: 600, min: 3, max: 5 },
  { code: "29", name: "Mascara",              home: 650,  office: 450, min: 2, max: 3 },
  { code: "30", name: "Ouargla",              home: 800,  office: 600, min: 3, max: 5 },
  { code: "31", name: "Oran",                 home: 600,  office: 400, min: 1, max: 2 },
  { code: "32", name: "El Bayadh",            home: 800,  office: 600, min: 3, max: 5 },
  { code: "33", name: "Illizi",               home: 800,  office: 600, min: 3, max: 5 },
  { code: "34", name: "Bordj Bou Arréridj",  home: 650,  office: 450, min: 2, max: 3 },
  { code: "35", name: "Boumerdès",           home: 500,  office: 350, min: 1, max: 2 },
  { code: "36", name: "El Tarf",              home: 650,  office: 450, min: 2, max: 3 },
  { code: "37", name: "Tindouf",              home: 800,  office: 600, min: 3, max: 5 },
  { code: "38", name: "Tissemsilt",           home: 650,  office: 450, min: 2, max: 3 },
  { code: "39", name: "El Oued",              home: 800,  office: 600, min: 3, max: 5 },
  { code: "40", name: "Khenchela",            home: 800,  office: 600, min: 3, max: 5 },
  { code: "41", name: "Souk Ahras",           home: 650,  office: 450, min: 2, max: 3 },
  { code: "42", name: "Tipaza",               home: 500,  office: 350, min: 1, max: 2 },
  { code: "43", name: "Mila",                 home: 650,  office: 450, min: 2, max: 3 },
  { code: "44", name: "Aïn Defla",           home: 650,  office: 450, min: 2, max: 3 },
  { code: "45", name: "Naâma",              home: 650,  office: 450, min: 2, max: 3 },
  { code: "46", name: "Aïn Témouchent",     home: 650,  office: 450, min: 2, max: 3 },
  { code: "47", name: "Ghardaïa",            home: 800,  office: 600, min: 3, max: 5 },
  { code: "48", name: "Relizane",             home: 650,  office: 450, min: 2, max: 3 },
  { code: "49", name: "Timimoun",             home: 1000, office: 750, min: 4, max: 7 },
  { code: "50", name: "Bordj Badji Mokhtar", home: 1000, office: 750, min: 4, max: 7 },
  { code: "51", name: "Ouled Djellal",        home: 1000, office: 750, min: 4, max: 7 },
  { code: "52", name: "Béni Abbès",          home: 1000, office: 750, min: 4, max: 7 },
  { code: "53", name: "In Salah",             home: 1000, office: 750, min: 4, max: 7 },
  { code: "54", name: "In Guezzam",           home: 1000, office: 750, min: 4, max: 7 },
  { code: "55", name: "Touggourt",            home: 1000, office: 750, min: 4, max: 7 },
  { code: "56", name: "Djanet",               home: 1000, office: 750, min: 4, max: 7 },
  { code: "57", name: "El M'Ghair",           home: 1000, office: 750, min: 4, max: 7 },
  { code: "58", name: "El Meniaa",            home: 1000, office: 750, min: 4, max: 7 },
];

async function seedWilayas() {
  let inserted = 0;
  for (const w of SEED) {
    const result = await db.insert(shippingRatesTable).values({
      wilayaCode: w.code, wilayaName: w.name,
      homeDeliveryPrice: w.home, officeDeliveryPrice: w.office,
      minDeliveryDays: w.min, maxDeliveryDays: w.max,
    }).onConflictDoNothing().returning({ id: shippingRatesTable.id });
    if (result.length > 0) inserted++;
  }
  return inserted;
}

router.post("/admin/shipping-rates/seed", ...guard, async (req, res): Promise<void> => {
  const inserted = await seedWilayas();
  res.json({ inserted, total: SEED.length, message: `${inserted} wilaya(s) initialisée(s)` });
});

router.post("/admin/shipping-rates/initialize", ...guard, async (req, res): Promise<void> => {
  const inserted = await seedWilayas();
  res.json({ inserted, total: SEED.length, message: `${inserted} wilaya(s) initialisée(s)` });
});

export default router;
