import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, ordersTable, cartTable, usersTable, shippingRatesTable, productsTable, productVariantsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { resolveCatalogItem } from "../lib/variant-catalog";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";

const router: IRouter = Router();

function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Full column set — requires migrations 0003 + 0004 on the target DB.
 * Use for dev DB and production after schema sync.
 */
const baseOrderCols = {
  id: ordersTable.id,
  idempotencyKey: ordersTable.idempotencyKey,
  guestAccessToken: ordersTable.guestAccessToken,
  userId: ordersTable.userId,
  status: ordersTable.status,
  paymentMethod: ordersTable.paymentMethod,
  paymentStatus: ordersTable.paymentStatus,
  paymentProofUrl: ordersTable.paymentProofUrl,
  paymentNotes: ordersTable.paymentNotes,
  subtotal: ordersTable.subtotal,
  discount: ordersTable.discount,
  couponCode: ordersTable.couponCode,
  shipping: ordersTable.shipping,
  total: ordersTable.total,
  shippingAddress: ordersTable.shippingAddress,
  items: ordersTable.items,
  notes: ordersTable.notes,
  createdAt: ordersTable.createdAt,
  updatedAt: ordersTable.updatedAt,
  // Shipping metadata — migrations 0003 + 0004; deliveryType: 'home' | 'office'
  deliveryType: ordersTable.deliveryType,
  shippingWilayaCode: ordersTable.shippingWilayaCode,
  shippingWilayaName: ordersTable.shippingWilayaName,
  shippingOfficeId: ordersTable.shippingOfficeId,
  shippingOfficeName: ordersTable.shippingOfficeName,
  estimatedDeliveryMinDays: ordersTable.estimatedDeliveryMinDays,
  estimatedDeliveryMaxDays: ordersTable.estimatedDeliveryMaxDays,
} as const;

/**
 * Fallback column set for production DBs that haven't received migrations 0003/0004 yet.
 * PostgreSQL error code 42703 = "column does not exist" — triggers automatic fallback.
 */
const legacyOrderCols = {
  id: ordersTable.id,
  idempotencyKey: ordersTable.idempotencyKey,
  userId: ordersTable.userId,
  status: ordersTable.status,
  paymentMethod: ordersTable.paymentMethod,
  paymentStatus: ordersTable.paymentStatus,
  paymentProofUrl: ordersTable.paymentProofUrl,
  paymentNotes: ordersTable.paymentNotes,
  subtotal: ordersTable.subtotal,
  discount: ordersTable.discount,
  couponCode: ordersTable.couponCode,
  shipping: ordersTable.shipping,
  total: ordersTable.total,
  shippingAddress: ordersTable.shippingAddress,
  items: ordersTable.items,
  notes: ordersTable.notes,
  createdAt: ordersTable.createdAt,
  updatedAt: ordersTable.updatedAt,
} as const;

/** True when the DB error is "column does not exist" (missing migration). */
function isMissingColumnError(err: any): boolean {
  return err?.code === "42703";
}

function formatOrder(o: any) {
  return {
    id: o.id, userId: o.userId, userName: o.userName || null, userEmail: o.userEmail || null,
    status: o.status,
    paymentMethod: o.paymentMethod || "cash_on_delivery",
    paymentStatus: o.paymentStatus || "pending",
    paymentProofUrl: o.paymentProofUrl || null,
    paymentNotes: o.paymentNotes || null,
    items: o.items || [], subtotal: parseFloat(o.subtotal), discount: parseFloat(o.discount || "0"),
    couponCode: o.couponCode || null, shipping: parseFloat(o.shipping || "0"), total: parseFloat(o.total),
    shippingAddress: o.shippingAddress, notes: o.notes || null,
    deliveryType: o.deliveryType || null,
    shippingWilayaCode: o.shippingWilayaCode || null,
    shippingWilayaName: o.shippingWilayaName || null,
    shippingOfficeId: o.shippingOfficeId || null,
    shippingOfficeName: o.shippingOfficeName || null,
    estimatedDeliveryMinDays: o.estimatedDeliveryMinDays || null,
    estimatedDeliveryMaxDays: o.estimatedDeliveryMaxDays || null,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

async function canonicalizeItems(rawItems: any[], executor: any = db) {
  const result: any[] = [];
  for (const raw of rawItems) {
    const productId = Number(raw.productId);
    const variantId = raw.variantId == null ? null : Number(raw.variantId);
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) throw new Error("Article invalide");
    const c = await resolveCatalogItem(productId, variantId, executor);
    if (!c || quantity > c.stock) throw new Error(`Stock insuffisant pour ${c?.label || "un article"}`);
    result.push({
      productId, variantId, name: c.label, price: c.price, comparePrice: c.comparePrice, quantity,
      images: c.imageUrl ? [c.imageUrl] : [], imageUrl: c.imageUrl, stock: c.stock, sku: c.sku, barcode: c.barcode,
      optionSnapshots: c.optionSnapshots, variantOptions: c.optionSnapshots,
    });
  }
  return result;
}

async function decrementStock(executor: any, items: any[]) {
  for (const item of items) {
    const table = item.variantId == null ? productsTable : productVariantsTable;
    const idColumn = item.variantId == null ? productsTable.id : productVariantsTable.id;
    const id = item.variantId == null ? item.productId : item.variantId;
    const activeCondition = item.variantId == null ? undefined : eq(productVariantsTable.isActive, true);
    const updated = await executor.update(table).set({ stock: sql`${table.stock} - ${item.quantity}` }).where(and(eq(idColumn, id), activeCondition, sql`${table.stock} >= ${item.quantity}`)).returning({ id: idColumn });
    if (!updated.length) throw new Error(`Stock insuffisant pour ${item.name}`);
  }
}

async function lockIdempotency(executor: any, scope: string, key?: string | null) {
  if (!key) return;
  await executor.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${scope}), hashtext(${key}))`);
}

/**
 * Resolves the authoritative delivery price from PostgreSQL.
 * The browser never supplies or controls the amount saved on the order.
 */
async function computeShipping(
  deliveryType: string | undefined,
  shippingAddress: Record<string, unknown> | undefined,
  preferredOfficeName?: string,
): Promise<{ shipping: number; meta: Record<string, unknown>; error?: string }> {
  if (!deliveryType || !["home", "office"].includes(deliveryType)) {
    return { shipping: 0, meta: {}, error: "Le mode de livraison doit être 'home' ou 'office'." };
  }
  if (deliveryType === "home" && !String(shippingAddress?.address ?? "").trim()) {
    return { shipping: 0, meta: {}, error: "L'adresse détaillée est requise pour la livraison à domicile." };
  }
  const wilayaRaw = String(shippingAddress?.wilaya ?? "").trim();
  const rawCode = wilayaRaw.split(" - ")[0]?.trim();
  if (!rawCode || !/^\d{1,2}$/.test(rawCode)) {
    return { shipping: 0, meta: {}, error: "Veuillez sélectionner une wilaya valide." };
  }
  const wilayaCode = rawCode.padStart(2, "0");
  const [rate] = await db
    .select()
    .from(shippingRatesTable)
    .where(eq(shippingRatesTable.wilayaCode, wilayaCode));
  if (!rate || !rate.isActive) {
    return { shipping: 0, meta: {}, error: "La livraison n'est pas disponible pour cette wilaya." };
  }
  if (deliveryType === "home" && !rate.homeDeliveryEnabled) {
    return { shipping: 0, meta: {}, error: "La livraison à domicile n'est pas disponible pour cette wilaya." };
  }
  if (deliveryType === "office" && !rate.officeDeliveryEnabled) {
    return { shipping: 0, meta: {}, error: "La livraison au bureau n'est pas disponible pour cette wilaya." };
  }
  const shipping = deliveryType === "home" ? rate.homeDeliveryPrice : rate.officeDeliveryPrice;
  const meta: Record<string, unknown> = {
    deliveryType,
    shippingWilayaCode: wilayaCode,
    shippingWilayaName: rate.wilayaName,
    estimatedDeliveryMinDays: rate.minDeliveryDays,
    estimatedDeliveryMaxDays: rate.maxDeliveryDays,
    ...(deliveryType === "office" && preferredOfficeName ? { shippingOfficeName: preferredOfficeName } : {}),
  };
  return { shipping, meta };
}

// ── Guest order (no auth required) ──────────────────────────────────────────
router.post("/orders/guest", async (req, res): Promise<void> => {
  const { items, shippingAddress, notes, paymentMethod, idempotencyKey, deliveryType, preferredOfficeName } = req.body;
  if (idempotencyKey != null && !isCanonicalUuid(idempotencyKey)) {
    res.status(400).json({ error: "idempotencyKey doit être un UUID valide" }); return;
  }
  if (idempotencyKey) {
    const [existing] = await db.select(baseOrderCols).from(ordersTable)
      .where(and(eq(ordersTable.idempotencyKey, idempotencyKey), sql`${ordersTable.userId} IS NULL`)).limit(1)
      .catch((err: any) => isMissingColumnError(err) ? db.select(legacyOrderCols).from(ordersTable).where(and(eq(ordersTable.idempotencyKey, idempotencyKey), sql`${ordersTable.userId} IS NULL`)).limit(1) : Promise.reject(err));
    if (existing) { res.status(200).json({ ...formatOrder(existing), guestAccessToken: (existing as any).guestAccessToken || null }); return; }
  }
  if (!shippingAddress || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items et shippingAddress requis" }); return;
  }
  const validPaymentMethods = ["cash_on_delivery", "bank_transfer", "cib_edahabia"];
  const resolvedPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "cash_on_delivery";
  const { shipping, meta: shippingMeta, error: shippingError } = await computeShipping(deliveryType, shippingAddress, preferredOfficeName);
  if (shippingError) { res.status(400).json({ error: shippingError }); return; }
  const initialPaymentStatus = resolvedPaymentMethod === "cash_on_delivery" ? "pending" : "awaiting_confirmation";
  const baseValues = {
    idempotencyKey: idempotencyKey || null,
    guestAccessToken: randomUUID(),
    userId: null as null,
    status: "pending" as const,
    paymentMethod: resolvedPaymentMethod,
    paymentStatus: initialPaymentStatus,
    discount: "0", couponCode: null as null, shipping: String(shipping),
    shippingAddress: shippingAddress as any, notes: notes || null,
  };
  try {
    const [order] = await db.transaction(async (tx) => {
      await lockIdempotency(tx, "guest-order", idempotencyKey);
      if (idempotencyKey) {
        const [existing] = await tx.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.idempotencyKey, idempotencyKey)).limit(1);
        if (existing) return [existing];
      }
      const txItems = await canonicalizeItems(items, tx);
      const txSubtotal = txItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      await decrementStock(tx, txItems);
      return tx.insert(ordersTable).values({ ...baseValues, subtotal: String(txSubtotal), total: String(txSubtotal + shipping), items: txItems as any, ...shippingMeta as any }).returning(baseOrderCols);
    });
    res.status(201).json({ ...formatOrder(order), guestAccessToken: (order as any).guestAccessToken || baseValues.guestAccessToken });
  } catch (err: any) {
    if (err?.code === "23505" && idempotencyKey) {
      const [existing] = await db.select(baseOrderCols).from(ordersTable)
        .where(and(eq(ordersTable.idempotencyKey, idempotencyKey), sql`${ordersTable.userId} IS NULL`)).limit(1);
      if (existing) { res.status(200).json({ ...formatOrder(existing), guestAccessToken: existing.guestAccessToken }); return; }
    }
    if (isMissingColumnError(err)) {
      // Legacy schema fallback still keeps stock decrement and idempotency atomic.
      const [order] = await db.transaction(async (tx) => {
        await lockIdempotency(tx, "guest-order", idempotencyKey);
        if (idempotencyKey) {
          const [existing] = await tx.select(legacyOrderCols).from(ordersTable).where(eq(ordersTable.idempotencyKey, idempotencyKey)).limit(1);
          if (existing) return [existing];
        }
        const txItems = await canonicalizeItems(items, tx);
        const txSubtotal = txItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await decrementStock(tx, txItems);
        const { guestAccessToken: _token, ...legacyValues } = baseValues;
        return tx.insert(ordersTable).values({ ...legacyValues, subtotal: String(txSubtotal), total: String(txSubtotal + shipping), items: txItems as any }).returning(legacyOrderCols);
      });
    res.status(201).json({ ...formatOrder(order), guestAccessToken: (order as any).guestAccessToken || baseValues.guestAccessToken });
      return;
    }
    if (err?.message === "Article invalide" || String(err?.message || "").startsWith("Stock insuffisant")) {
      res.status(400).json({ error: err.message }); return;
    }
    console.error("[guest order] DB error:", err?.code, err?.detail ?? err?.message ?? err);
    res.status(500).json({ error: "Erreur lors de la création de la commande. Veuillez réessayer." });
  }
});

// Guest: submit payment proof by order ID (no account needed)
router.patch("/orders/guest/:id/payment-proof", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { paymentProofUrl, guestAccessToken } = req.body;
  if (!paymentProofUrl) { res.status(400).json({ error: "paymentProofUrl requis" }); return; }
  const [order] = await db.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Commande non trouvée" }); return; }
  if (order.userId !== null) { res.status(403).json({ error: "Utilisez l'endpoint authentifié" }); return; }
  const suppliedToken = String(guestAccessToken || req.header("x-guest-access-token") || "");
  if (!order.guestAccessToken || suppliedToken !== order.guestAccessToken) { res.status(403).json({ error: "Jeton d'accès invité invalide" }); return; }
  const [updated] = await db.update(ordersTable)
    .set({ paymentProofUrl, paymentStatus: "awaiting_confirmation" })
    .where(eq(ordersTable.id, id)).returning(baseOrderCols);
  res.json(formatOrder(updated));
});

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const orders = await db.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.userId, userId)).orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(formatOrder));
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { shippingAddress, notes, paymentMethod, idempotencyKey, deliveryType, preferredOfficeName } = req.body;
  if (idempotencyKey) {
    const [existing] = await db.select(baseOrderCols).from(ordersTable)
      .where(and(eq(ordersTable.userId, userId), eq(ordersTable.idempotencyKey, idempotencyKey))).limit(1)
      .catch((err: any) => isMissingColumnError(err) ? db.select(legacyOrderCols).from(ordersTable).where(and(eq(ordersTable.userId, userId), eq(ordersTable.idempotencyKey, idempotencyKey))).limit(1) : Promise.reject(err));
    if (existing) { res.status(200).json(formatOrder(existing)); return; }
  }
  if (!shippingAddress) { res.status(400).json({ error: "shippingAddress requis" }); return; }

  const validPaymentMethods = ["cash_on_delivery", "bank_transfer", "cib_edahabia"];
  const resolvedPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "cash_on_delivery";

  const { shipping, meta: shippingMeta, error: shippingError } = await computeShipping(deliveryType, shippingAddress, preferredOfficeName);
  if (shippingError) { res.status(400).json({ error: shippingError }); return; }

  // Payment status: bank_transfer starts as "awaiting_confirmation", others as "pending"
  const initialPaymentStatus = resolvedPaymentMethod === "cash_on_delivery" ? "pending" : "awaiting_confirmation";

  const authBaseValues = {
    idempotencyKey: idempotencyKey || null,
    userId,
    status: "pending" as const,
    paymentMethod: resolvedPaymentMethod,
    paymentStatus: initialPaymentStatus,
    discount: "0", shipping: String(shipping),
    shippingAddress: shippingAddress as any, notes: notes || null,
  };

  try {
    let result: any[];
    // The stock decrements, order insert, and cart deletion share one transaction.
    // Idempotency is checked before decrementing so retries cannot consume stock twice.
    result = await db.transaction(async (tx) => {
      await lockIdempotency(tx, `auth-order:${userId}`, idempotencyKey);
      const [already] = idempotencyKey ? await tx.select(baseOrderCols).from(ordersTable)
        .where(and(eq(ordersTable.userId, userId), eq(ordersTable.idempotencyKey, idempotencyKey))).limit(1) : [];
      if (already) return [already];
      const [cart] = await tx.select().from(cartTable).where(eq(cartTable.userId, userId));
      if (!cart || !Array.isArray(cart.items) || (cart.items as any[]).length === 0) throw new Error("Panier vide");
      const items = cart.items as any[];
      const txItems = await canonicalizeItems(items, tx);
      const txSubtotal = txItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      await decrementStock(tx, txItems);
      const inserted = await tx.insert(ordersTable).values({ ...authBaseValues, couponCode: (cart.couponCode as string) || null, subtotal: String(txSubtotal), total: String(txSubtotal + shipping), items: txItems as any, ...shippingMeta as any }).returning(baseOrderCols);
      await tx.delete(cartTable).where(eq(cartTable.userId, userId));
      return inserted;
    }).catch(async (err: any) => {
      if (isMissingColumnError(err)) {
        return db.transaction(async (tx) => {
          await lockIdempotency(tx, `auth-order:${userId}`, idempotencyKey);
          const [already] = idempotencyKey ? await tx.select(legacyOrderCols).from(ordersTable).where(and(eq(ordersTable.userId, userId), eq(ordersTable.idempotencyKey, idempotencyKey))).limit(1) : [];
          if (already) return [already];
          const [cart] = await tx.select().from(cartTable).where(eq(cartTable.userId, userId));
          if (!cart || !Array.isArray(cart.items) || (cart.items as any[]).length === 0) throw new Error("Panier vide");
          const items = cart.items as any[];
          const txItems = await canonicalizeItems(items, tx);
          const txSubtotal = txItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          await decrementStock(tx, txItems);
          const inserted = await tx.insert(ordersTable).values({ ...authBaseValues, couponCode: (cart.couponCode as string) || null, subtotal: String(txSubtotal), total: String(txSubtotal + shipping), items: txItems as any }).returning(legacyOrderCols);
          await tx.delete(cartTable).where(eq(cartTable.userId, userId));
          return inserted;
        });
      }
      throw err;
    });
    const [order] = result;

    res.status(201).json(formatOrder(order));
  } catch (err: any) {
    if (err?.code === "23505" && idempotencyKey) {
      const [existing] = await db.select(baseOrderCols).from(ordersTable)
        .where(and(eq(ordersTable.userId, userId), eq(ordersTable.idempotencyKey, idempotencyKey))).limit(1);
      if (existing) { res.status(200).json(formatOrder(existing)); return; }
    }
    if (err?.message === "Panier vide" || err?.message === "Article invalide" || String(err?.message || "").startsWith("Stock insuffisant")) {
      res.status(400).json({ error: err.message }); return;
    }
    console.error("[auth order] DB error:", err?.code, err?.detail ?? err?.message ?? err);
    res.status(500).json({ error: "Erreur lors de la création de la commande. Veuillez réessayer." });
  }
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const userId = (req as any).userId;
  const userRole = (req as any).userRole;
  const [order] = await db.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Commande non trouvée" }); return; }
  if (order.userId !== userId && userRole !== "admin" && userRole !== "staff") {
    res.status(403).json({ error: "Accès refusé" }); return;
  }
  res.json(formatOrder(order));
});

// Customer: submit payment proof (for bank_transfer)
router.patch("/orders/:id/payment-proof", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const userId = (req as any).userId;
  const { paymentProofUrl } = req.body;

  if (!paymentProofUrl) { res.status(400).json({ error: "paymentProofUrl requis" }); return; }

  const [order] = await db.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Commande non trouvée" }); return; }
  if (order.userId !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }
  if (order.paymentMethod !== "bank_transfer") {
    res.status(400).json({ error: "Preuve de paiement uniquement pour virement bancaire" }); return;
  }

  const [updated] = await db.update(ordersTable)
    .set({ paymentProofUrl, paymentStatus: "awaiting_confirmation" })
    .where(eq(ordersTable.id, id))
    .returning(baseOrderCols);
  res.json(formatOrder(updated));
});

// Admin routes
router.get("/admin/orders", requireAdminSession, requirePermission("manage_orders"), async (req, res): Promise<void> => {
  const { page = "1", limit = "20", status, paymentStatus, search } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const offset = (pageNum - 1) * limitNum;
  const conditions: any[] = [];
  if (status) conditions.push(eq(ordersTable.status, status));
  if (paymentStatus) conditions.push(eq(ordersTable.paymentStatus, paymentStatus));
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(sql`(
      CAST(${ordersTable.id} AS TEXT) ILIKE ${term}
      OR COALESCE(${ordersTable.shippingAddress}->>'fullName', '') ILIKE ${term}
      OR COALESCE(${ordersTable.shippingAddress}->>'phone', '') ILIKE ${term}
      OR COALESCE(CAST(${ordersTable.items} AS TEXT), '') ILIKE ${term}
      OR COALESCE(${usersTable.name}, '') ILIKE ${term}
      OR COALESCE(${usersTable.email}, '') ILIKE ${term}
    )`);
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  // Always left-join users so search on user name/email works for the count too
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(whereClause);
  const orders = await db.select({
    order: baseOrderCols, userName: usersTable.name, userEmail: usersTable.email
  }).from(ordersTable).leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(whereClause).orderBy(desc(ordersTable.createdAt)).limit(limitNum).offset(offset);
  res.json({ orders: orders.map((o) => formatOrder({ ...o.order, userName: o.userName, userEmail: o.userEmail })), total: count, page: pageNum, totalPages: Math.ceil(count / limitNum) });
});

router.patch("/admin/orders/:id/status", requireAdminSession, requirePermission("manage_orders"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: "status requis" }); return; }
  const [old] = await db.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.id, id));
  const [order] = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id)).returning(baseOrderCols);
  if (!order) { res.status(404).json({ error: "Commande non trouvée" }); return; }
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_order_status", "order", id, { status: old?.status }, { status }, getIp(req));
  res.json(formatOrder(order));
});

// Admin: confirm or reject payment
router.patch("/admin/orders/:id/payment", requireAdminSession, requirePermission("manage_orders"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { paymentStatus, paymentNotes } = req.body;

  const validStatuses = ["pending", "awaiting_confirmation", "confirmed", "failed"];
  if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
    res.status(400).json({ error: "paymentStatus invalide" }); return;
  }

  const [old] = await db.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.id, id));
  if (!old) { res.status(404).json({ error: "Commande non trouvée" }); return; }

  const updates: Record<string, unknown> = { paymentStatus };
  if (paymentNotes !== undefined) updates.paymentNotes = paymentNotes;

  // Auto-confirm order when payment is confirmed
  if (paymentStatus === "confirmed" && old.status === "pending") {
    updates.status = "confirmed";
  }

  const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning(baseOrderCols);
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_payment_status", "order", id,
    { paymentStatus: old.paymentStatus }, { paymentStatus, paymentNotes }, getIp(req));
  res.json(formatOrder(order));
});

// Admin: delete an order
router.delete("/admin/orders/:id", requireAdminSession, requirePermission("manage_orders"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
    const [deleted] = await db.delete(ordersTable).where(eq(ordersTable.id, id)).returning({ id: ordersTable.id });
    if (!deleted) { res.status(404).json({ error: "Commande non trouvée" }); return; }
    logActivity(req.adminUser!.id, req.adminUser!.fullName, "delete_order", "order", id, null, null, getIp(req))
      .catch(() => {});
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur lors de la suppression de la commande" });
  }
});

export default router;
