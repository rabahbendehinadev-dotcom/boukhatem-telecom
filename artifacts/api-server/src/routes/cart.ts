import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, cartTable, couponsTable, settingsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { resolveCatalogItem } from "../lib/variant-catalog";

const router: IRouter = Router();

interface CartItem {
  productId: number;
  variantId: number | null;
  name: string;
  price: number;
  comparePrice: number | null;
  quantity: number;
  images: string[];
  stock: number;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  optionSnapshots?: unknown[];
}

function canonicalFields(c: Awaited<ReturnType<typeof resolveCatalogItem>>) {
  if (!c) throw new Error("missing catalog item");
  return { name: c.label, price: c.price, comparePrice: c.comparePrice, images: c.imageUrl ? [c.imageUrl] : [], imageUrl: c.imageUrl, stock: c.stock, sku: c.sku, barcode: c.barcode, optionSnapshots: c.optionSnapshots };
}

async function getUserCart(userId: number) {
  const [cart] = await db.select().from(cartTable).where(eq(cartTable.userId, userId));
  return cart;
}

async function computeCartTotals(items: CartItem[], couponCode: string | null, shippingCost: number) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let couponDiscount = 0;
  if (couponCode) {
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode));
    if (coupon && coupon.isActive) {
      if (coupon.discountType === "percentage") couponDiscount = subtotal * parseFloat(coupon.discountValue) / 100;
      else couponDiscount = parseFloat(coupon.discountValue);
    }
  }
  const discount = Math.min(couponDiscount, subtotal);
  const total = subtotal - discount + shippingCost;
  return { subtotal, discount, couponDiscount, shipping: shippingCost, total };
}

function buildResponse(items: CartItem[], couponCode: string | null, totals: ReturnType<typeof computeCartTotals> extends Promise<infer T> ? T : never) {
  return { items, subtotal: totals.subtotal, discount: totals.discount, couponCode, couponDiscount: totals.couponDiscount, shipping: totals.shipping, total: totals.total, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
}

async function getShippingCost(): Promise<number> {
  try {
    const [s] = await db.select({ shippingCost: settingsTable.shippingCost }).from(settingsTable).limit(1);
    if (!s) return 0;
    const parsed = parseFloat(s.shippingCost ?? "0");
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const cart = await getUserCart(userId);
  const items: CartItem[] = (cart?.items as CartItem[]) || [];
  const couponCode = (cart?.couponCode as string | null) || null;
  const shippingCost = await getShippingCost();
  const totals = await computeCartTotals(items, couponCode, shippingCost);
  res.json(buildResponse(items, couponCode, totals));
});

router.delete("/cart", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  await db.delete(cartTable).where(eq(cartTable.userId, userId));
  res.json({ message: "Panier vidé" });
});

router.post("/cart/items", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { productId, variantId = null, quantity } = req.body;
  if (!productId || !quantity) { res.status(400).json({ error: "productId et quantity requis" }); return; }
  const canonical = await resolveCatalogItem(Number(productId), variantId == null ? null : Number(variantId));
  if (!canonical) { res.status(404).json({ error: "Produit ou variante non trouvé/inactive" }); return; }
  if (Number(quantity) <= 0 || Number(quantity) > canonical.stock) { res.status(400).json({ error: "Stock insuffisant" }); return; }

  const cart = await getUserCart(userId);
  let items: CartItem[] = (cart?.items as CartItem[]) || [];
  const idx = items.findIndex((i) => i.productId === Number(productId) && (i.variantId ?? null) === (variantId == null ? null : Number(variantId)));
  if (idx >= 0) {
    const next = items[idx].quantity + Number(quantity);
    if (next > canonical.stock) { res.status(400).json({ error: "Stock insuffisant" }); return; }
    items[idx] = { ...items[idx], quantity: next, ...canonicalFields(canonical) };
  } else {
    items.push({ productId: Number(productId), variantId: variantId == null ? null : Number(variantId), quantity: Number(quantity), ...canonicalFields(canonical) });
  }
  const couponCode = (cart?.couponCode as string | null) || null;
  if (cart) {
    await db.update(cartTable).set({ items: items as any }).where(eq(cartTable.userId, userId));
  } else {
    await db.insert(cartTable).values({ userId, items: items as any });
  }
  const shippingCostAdd = await getShippingCost();
  const totals = await computeCartTotals(items, couponCode, shippingCostAdd);
  res.json(buildResponse(items, couponCode, totals));
});

router.patch("/cart/items/:productId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const productId = parseInt(req.params.productId as string, 10);
  const variantId = req.body.variantId == null ? (req.query.variantId == null ? null : Number(req.query.variantId)) : Number(req.body.variantId);
  const { quantity } = req.body;
  const cart = await getUserCart(userId);
  if (!cart) { res.status(404).json({ error: "Panier non trouvé" }); return; }
  let items: CartItem[] = (cart.items as CartItem[]) || [];
  const idx = items.findIndex((i) => i.productId === productId && (i.variantId ?? null) === variantId);
  if (idx >= 0) {
    if (quantity <= 0) items.splice(idx, 1);
    else {
      const canonical = await resolveCatalogItem(productId, variantId);
      if (!canonical || quantity > canonical.stock) { res.status(400).json({ error: "Variante invalide ou stock insuffisant" }); return; }
      items[idx].quantity = quantity;
      Object.assign(items[idx], canonicalFields(canonical));
    }
  }
  const couponCode = (cart.couponCode as string | null) || null;
  await db.update(cartTable).set({ items: items as any }).where(eq(cartTable.userId, userId));
  const shippingCostPatch = await getShippingCost();
  const totals = await computeCartTotals(items, couponCode, shippingCostPatch);
  res.json(buildResponse(items, couponCode, totals));
});

router.delete("/cart/items/:productId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const productId = parseInt(req.params.productId as string, 10);
  const variantId = req.query.variantId == null ? null : Number(req.query.variantId);
  const cart = await getUserCart(userId);
  if (!cart) { res.status(404).json({ error: "Panier non trouvé" }); return; }
  let items: CartItem[] = (cart.items as CartItem[]) || [];
  items = items.filter((i) => !(i.productId === productId && (i.variantId ?? null) === variantId));
  const couponCode = (cart.couponCode as string | null) || null;
  await db.update(cartTable).set({ items: items as any }).where(eq(cartTable.userId, userId));
  const shippingCostDel = await getShippingCost();
  const totals = await computeCartTotals(items, couponCode, shippingCostDel);
  res.json(buildResponse(items, couponCode, totals));
});

router.post("/cart/coupon", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { code } = req.body;
  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code));
  if (!coupon || !coupon.isActive) { res.status(400).json({ error: "Code promo invalide" }); return; }
  const cart = await getUserCart(userId);
  if (!cart) { res.status(404).json({ error: "Panier vide" }); return; }
  const items: CartItem[] = (cart.items as CartItem[]) || [];
  await db.update(cartTable).set({ couponCode: code as any }).where(eq(cartTable.userId, userId));
  const shippingCostCoupon = await getShippingCost();
  const totals = await computeCartTotals(items, code, shippingCostCoupon);
  res.json(buildResponse(items, code, totals));
});

export default router;
