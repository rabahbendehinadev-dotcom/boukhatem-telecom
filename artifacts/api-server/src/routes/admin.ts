import { Router, type IRouter } from "express";
import { eq, sql, desc, gte, ilike, and } from "drizzle-orm";
import { db, usersTable, productsTable, ordersTable, shippingRatesTable } from "@workspace/db";
import { requireAdminSession, requirePermission, logActivity, getIp } from "../lib/admin-auth";

const router: IRouter = Router();

/**
 * Safe column set that excludes NOEST delivery columns added in migration 0001.
 * Using `ordersTable` directly in db.select() generates an explicit column list;
 * if the production DB hasn't run the migration yet it throws "column does not exist".
 * Once the migration is applied on production this guard can be removed.
 */
const baseOrderCols = {
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
  // NOTE: shipping metadata columns (migration 0003) excluded until ALTER TABLE
  // runs on production. Same guard pattern as for NOEST columns (migration 0001).
} as const;

function formatOrder(o: any) {
  return {
    id: o.id, userId: o.userId, userName: o.userName || null, userEmail: o.userEmail || null,
    status: o.status, items: o.items || [], subtotal: parseFloat(o.subtotal), discount: parseFloat(o.discount || "0"),
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

function formatProduct(p: any) {
  return {
    id: p.id, name: p.name, slug: p.slug, price: parseFloat(p.price),
    comparePrice: p.comparePrice ? parseFloat(p.comparePrice) : null,
    discountPercent: p.comparePrice ? Math.round((1 - parseFloat(p.price) / parseFloat(p.comparePrice)) * 100) : null,
    stock: p.stock, sku: p.sku, isNew: p.isNew, isFeatured: p.isFeatured, hasDiscount: p.hasDiscount,
    averageRating: parseFloat(p.averageRating || "0"), reviewCount: p.reviewCount || 0,
    images: p.images || [], categoryId: p.categoryId, categoryName: null, brandId: p.brandId, brandName: null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

router.get("/admin/dashboard", requireAdminSession, requirePermission("view_dashboard"), async (_req, res): Promise<void> => {
  const [totalProductsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
  const [totalCustomersRow] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "customer"));
  const [totalOrdersRow] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const [totalSalesRow] = await db.select({ sum: sql<string>`coalesce(sum(total),0)::text` }).from(ordersTable).where(eq(ordersTable.status, "delivered"));
  const [pendingRow] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending"));
  const [pendingPaymentsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.paymentStatus, "awaiting_confirmation"));
  const [lowStockRow] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(sql`${productsTable.stock} <= 5`);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [salesMonthRow] = await db.select({ sum: sql<string>`coalesce(sum(total),0)::text` }).from(ordersTable).where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, startOfMonth)));
  const [ordersMonthRow] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(gte(ordersTable.createdAt, startOfMonth));

  const recentOrders = await db.select({ order: baseOrderCols, userName: usersTable.name, userEmail: usersTable.email })
    .from(ordersTable).leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .orderBy(desc(ordersTable.createdAt)).limit(5);

  const topProducts = await db.select().from(productsTable).where(eq(productsTable.isFeatured, true)).limit(5);

  res.json({
    totalSales: parseFloat(totalSalesRow.sum || "0"),
    totalOrders: totalOrdersRow.count,
    totalProducts: totalProductsRow.count,
    totalCustomers: totalCustomersRow.count,
    pendingOrders: pendingRow.count,
    pendingPayments: pendingPaymentsRow.count,
    lowStockCount: lowStockRow.count,
    recentOrders: recentOrders.map((o) => formatOrder({ ...o.order, userName: o.userName, userEmail: o.userEmail })),
    topProducts: topProducts.map(formatProduct),
    salesThisMonth: parseFloat(salesMonthRow.sum || "0"),
    ordersThisMonth: ordersMonthRow.count,
  });
});

router.get("/admin/customers", requireAdminSession, requirePermission("manage_clients"), async (req, res): Promise<void> => {
  const { page = "1", search } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limit = 20;
  const offset = (pageNum - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [eq(usersTable.role, "customer")];
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));
  const whereClause = and(...conditions);
  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(usersTable).where(whereClause);
  const customers = await db.select().from(usersTable).where(whereClause).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  const result = customers.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, isBlocked: u.isBlocked, totalOrders: 0, totalSpent: 0, createdAt: u.createdAt.toISOString() }));
  res.json({ customers: result, total: cnt, page: pageNum, totalPages: Math.ceil(cnt / limit) });
});

router.get("/admin/customers/:id", requireAdminSession, requirePermission("manage_clients"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Client non trouvé" }); return; }
  const orders = await db.select(baseOrderCols).from(ordersTable).where(eq(ordersTable.userId, id)).orderBy(desc(ordersTable.createdAt)).limit(10);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBlocked: user.isBlocked, totalOrders: orders.length, totalSpent: orders.reduce((s, o) => s + parseFloat(o.total), 0), createdAt: user.createdAt.toISOString() },
    orders: orders.map(formatOrder),
  });
});

router.patch("/admin/customers/:id", requireAdminSession, requirePermission("manage_clients"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { isBlocked, role } = req.body;
  const updates: Record<string, unknown> = {};
  if (isBlocked !== undefined) updates.isBlocked = isBlocked;
  if (role !== undefined) updates.role = role;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Client non trouvé" }); return; }
  await logActivity(req.adminUser!.id, req.adminUser!.fullName, "update_customer", "customer", id, null, updates, getIp(req));
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBlocked: user.isBlocked, totalOrders: 0, totalSpent: 0, createdAt: user.createdAt.toISOString() });
});

router.get("/admin/low-stock", requireAdminSession, requirePermission("view_dashboard"), async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(sql`${productsTable.stock} <= 5`).orderBy(productsTable.stock).limit(20);
  res.json(products.map(formatProduct));
});

router.get("/admin/sales-chart", requireAdminSession, requirePermission("view_dashboard"), async (req, res): Promise<void> => {
  const period = (req.query.period as string) || "30d";
  let daysBack = 30;
  if (period === "7d") daysBack = 7;
  else if (period === "90d") daysBack = 90;
  else if (period === "1y") daysBack = 365;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const rows = await db.select({
    date: sql<string>`date_trunc('day', created_at)::date::text`,
    sales: sql<string>`coalesce(sum(total),0)::text`,
    orders: sql<number>`count(*)::int`,
  }).from(ordersTable).where(gte(ordersTable.createdAt, cutoff)).groupBy(sql`date_trunc('day', created_at)`).orderBy(sql`date_trunc('day', created_at)`);

  res.json(rows.map((r) => ({ date: r.date, sales: parseFloat(r.sales), orders: r.orders })));
});

export default router;
