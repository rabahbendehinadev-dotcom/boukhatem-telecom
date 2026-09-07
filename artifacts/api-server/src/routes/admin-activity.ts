import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db, adminActivityLogTable, adminUsersTable } from "@workspace/db";
import { requireAdminSession, requirePermission } from "../lib/admin-auth";

const router: IRouter = Router();

// GET /api/admin/activity
router.get(
  "/admin/activity",
  requireAdminSession,
  requirePermission("view_dashboard"),
  async (req, res): Promise<void> => {
    const {
      page = "1",
      adminUserId,
      action,
      entityType,
      from,
      to,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = 50;
    const offset = (pageNum - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (adminUserId)
      conditions.push(
        eq(adminActivityLogTable.adminUserId, parseInt(adminUserId, 10)),
      );
    if (action) conditions.push(eq(adminActivityLogTable.action, action));
    if (entityType)
      conditions.push(eq(adminActivityLogTable.entityType, entityType));
    if (from)
      conditions.push(gte(adminActivityLogTable.createdAt, new Date(from)));
    if (to)
      conditions.push(lte(adminActivityLogTable.createdAt, new Date(to)));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(adminActivityLogTable)
      .where(whereClause);

    const logs = await db
      .select({
        log: adminActivityLogTable,
      })
      .from(adminActivityLogTable)
      .where(whereClause)
      .orderBy(desc(adminActivityLogTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Also get admin users for filter dropdown
    const admins = await db
      .select({ id: adminUsersTable.id, fullName: adminUsersTable.fullName })
      .from(adminUsersTable)
      .orderBy(adminUsersTable.fullName);

    res.json({
      logs: logs.map(({ log }) => ({
        id: log.id,
        adminUserId: log.adminUserId,
        adminName: log.adminName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      total: cnt,
      page: pageNum,
      totalPages: Math.ceil(cnt / limit),
      admins,
    });
  },
);

// GET /api/admin/roles — returns roles with their default permissions
router.get(
  "/admin/roles",
  requireAdminSession,
  requirePermission("view_dashboard"),
  (_req, res): void => {
    res.json({
      roles: [
        {
          id: "super_admin",
          label: "Super Admin",
          permissions: [
            "view_dashboard",
            "manage_products",
            "manage_categories",
            "manage_brands",
            "manage_stock",
            "manage_orders",
            "manage_clients",
            "manage_coupons",
            "manage_banners",
            "manage_settings",
            "manage_admin_users",
          ],
        },
        {
          id: "admin",
          label: "Admin",
          permissions: [
            "view_dashboard",
            "manage_products",
            "manage_categories",
            "manage_brands",
            "manage_stock",
            "manage_orders",
            "manage_clients",
            "manage_coupons",
            "manage_banners",
            "manage_settings",
          ],
        },
        {
          id: "stock_manager",
          label: "Gestionnaire de stock",
          permissions: [
            "view_dashboard",
            "manage_products",
            "manage_categories",
            "manage_brands",
            "manage_stock",
          ],
        },
        {
          id: "order_manager",
          label: "Gestionnaire des commandes",
          permissions: ["view_dashboard", "manage_orders", "manage_clients"],
        },
        {
          id: "employee",
          label: "Employé",
          permissions: ["view_dashboard"],
        },
      ],
      allPermissions: [
        { id: "view_dashboard", label: "Voir le tableau de bord" },
        { id: "manage_products", label: "Gérer les produits" },
        { id: "manage_categories", label: "Gérer les catégories" },
        { id: "manage_brands", label: "Gérer les marques" },
        { id: "manage_stock", label: "Gérer le stock" },
        { id: "manage_orders", label: "Gérer les commandes" },
        { id: "manage_clients", label: "Gérer les clients" },
        { id: "manage_coupons", label: "Gérer les coupons" },
        { id: "manage_banners", label: "Gérer les bannières" },
        { id: "manage_settings", label: "Gérer les paramètres" },
        { id: "manage_admin_users", label: "Gérer les administrateurs" },
      ],
    });
  },
);

export default router;
