import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import {
  requireAdminSession,
  requirePermission,
  logActivity,
  getIp,
  ALL_PERMISSIONS,
} from "../lib/admin-auth";

const router: IRouter = Router();

const VALID_ROLES = [
  "super_admin",
  "admin",
  "stock_manager",
  "order_manager",
  "employee",
];

function formatAdminUser(u: typeof adminUsersTable.$inferSelect) {
  return {
    id: u.id,
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    role: u.role,
    permissions: u.permissions,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    lastLoginIp: u.lastLoginIp,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

// GET /api/admin/admin-users
router.get(
  "/admin/admin-users",
  requireAdminSession,
  requirePermission("manage_admin_users"),
  async (req, res): Promise<void> => {
    const { page = "1", search } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    const conditions = search
      ? [ilike(adminUsersTable.fullName, `%${search}%`)]
      : [];
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(adminUsersTable)
      .where(whereClause);

    const users = await db
      .select()
      .from(adminUsersTable)
      .where(whereClause)
      .orderBy(desc(adminUsersTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      users: users.map(formatAdminUser),
      total: cnt,
      page: pageNum,
      totalPages: Math.ceil(cnt / limit),
    });
  },
);

// POST /api/admin/admin-users
router.post(
  "/admin/admin-users",
  requireAdminSession,
  requirePermission("manage_admin_users"),
  async (req, res): Promise<void> => {
    const { fullName, username, email, password, role, permissions } =
      req.body as Record<string, string | string[]>;

    if (!fullName || !username || !email || !password || !role) {
      res.status(400).json({ error: "Données manquantes" });
      return;
    }
    if (!VALID_ROLES.includes(role as string)) {
      res.status(400).json({ error: "Rôle invalide" });
      return;
    }
    if ((password as string).length < 8) {
      res
        .status(400)
        .json({ error: "Le mot de passe doit faire au moins 8 caractères" });
      return;
    }

    const passwordHash = await bcrypt.hash(password as string, 12);
    const perms = Array.isArray(permissions)
      ? permissions.filter((p) =>
          (ALL_PERMISSIONS as readonly string[]).includes(p),
        )
      : [];

    try {
      const [user] = await db
        .insert(adminUsersTable)
        .values({
          fullName: fullName as string,
          username: (username as string).toLowerCase(),
          email: (email as string).toLowerCase(),
          passwordHash,
          role: role as string,
          permissions: perms,
          mustChangePassword: true,
        })
        .returning();

      await logActivity(
        req.adminUser!.id,
        req.adminUser!.fullName,
        "create_admin_user",
        "admin_user",
        user.id,
        null,
        { fullName: user.fullName, email: user.email, role: user.role },
        getIp(req),
      );

      res.status(201).json(formatAdminUser(user));
    } catch (err: any) {
      if (err?.code === "23505") {
        res
          .status(409)
          .json({ error: "Cet email ou nom d'utilisateur existe déjà" });
      } else {
        throw err;
      }
    }
  },
);

// GET /api/admin/admin-users/:id
router.get(
  "/admin/admin-users/:id",
  requireAdminSession,
  requirePermission("manage_admin_users"),
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id));
    if (!user) {
      res.status(404).json({ error: "Administrateur non trouvé" });
      return;
    }
    res.json(formatAdminUser(user));
  },
);

// PATCH /api/admin/admin-users/:id
router.patch(
  "/admin/admin-users/:id",
  requireAdminSession,
  requirePermission("manage_admin_users"),
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);

    // Prevent demoting oneself
    if (id === req.adminUser!.id) {
      res
        .status(400)
        .json({ error: "Vous ne pouvez pas modifier votre propre compte ici" });
      return;
    }

    const { fullName, username, email, role, permissions, isActive } =
      req.body as Record<string, string | string[] | boolean>;

    const updates: Partial<typeof adminUsersTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (fullName) updates.fullName = fullName as string;
    if (username) updates.username = (username as string).toLowerCase();
    if (email) updates.email = (email as string).toLowerCase();
    if (role && VALID_ROLES.includes(role as string))
      updates.role = role as string;
    if (Array.isArray(permissions))
      updates.permissions = permissions.filter((p) =>
        (ALL_PERMISSIONS as readonly string[]).includes(p),
      );
    if (isActive !== undefined) updates.isActive = isActive as boolean;

    const [old] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id));
    if (!old) {
      res.status(404).json({ error: "Administrateur non trouvé" });
      return;
    }

    const [user] = await db
      .update(adminUsersTable)
      .set(updates)
      .where(eq(adminUsersTable.id, id))
      .returning();

    await logActivity(
      req.adminUser!.id,
      req.adminUser!.fullName,
      "update_admin_user",
      "admin_user",
      id,
      formatAdminUser(old),
      formatAdminUser(user),
      getIp(req),
    );

    res.json(formatAdminUser(user));
  },
);

// PATCH /api/admin/admin-users/:id/change-password
router.patch(
  "/admin/admin-users/:id/change-password",
  requireAdminSession,
  requirePermission("manage_admin_users"),
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    const { newPassword } = req.body as { newPassword?: string };

    if (!newPassword || newPassword.length < 8) {
      res
        .status(400)
        .json({ error: "Le mot de passe doit faire au moins 8 caractères" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [user] = await db
      .update(adminUsersTable)
      .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
      .where(eq(adminUsersTable.id, id))
      .returning();

    if (!user) {
      res.status(404).json({ error: "Administrateur non trouvé" });
      return;
    }

    await logActivity(
      req.adminUser!.id,
      req.adminUser!.fullName,
      "reset_admin_password",
      "admin_user",
      id,
      null,
      null,
      getIp(req),
    );

    res.json({ ok: true });
  },
);

// DELETE /api/admin/admin-users/:id
router.delete(
  "/admin/admin-users/:id",
  requireAdminSession,
  requirePermission("manage_admin_users"),
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);

    if (id === req.adminUser!.id) {
      res
        .status(400)
        .json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
      return;
    }

    const [deleted] = await db
      .delete(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Administrateur non trouvé" });
      return;
    }

    await logActivity(
      req.adminUser!.id,
      req.adminUser!.fullName,
      "delete_admin_user",
      "admin_user",
      id,
      { fullName: deleted.fullName, email: deleted.email },
      null,
      getIp(req),
    );

    res.json({ ok: true });
  },
);

export default router;
