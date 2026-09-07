import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import {
  db,
  adminSessionsTable,
  adminUsersTable,
  adminActivityLogTable,
} from "@workspace/db";

// ─── Permissions ────────────────────────────────────────────────────────────

export const ALL_PERMISSIONS = [
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
  "manage_shipping_rates",
  "manage_admin_users",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  admin: ALL_PERMISSIONS.filter((p) => p !== "manage_admin_users"),
  stock_manager: [
    "view_dashboard",
    "manage_products",
    "manage_categories",
    "manage_brands",
    "manage_stock",
  ],
  order_manager: ["view_dashboard", "manage_orders", "manage_clients"],
  employee: ["view_dashboard"],
};

export function getEffectivePermissions(
  role: string,
  customPermissions: string[],
): string[] {
  if (customPermissions.length > 0) return customPermissions;
  return ROLE_PERMISSIONS[role] ?? ["view_dashboard"];
}

// ─── Token helpers ──────────────────────────────────────────────────────────

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Cookie settings ────────────────────────────────────────────────────────

export const COOKIE_NAME = "admin_sid";
const SESSION_DURATION_DEFAULT = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_DURATION_REMEMBER = 7 * 24 * 60 * 60 * 1000; // 7 days

export function setCookieOptions(rememberMe: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: rememberMe ? SESSION_DURATION_REMEMBER : SESSION_DURATION_DEFAULT,
    path: "/",
  };
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin: Date | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

export async function requireAdminSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const rows = await db
    .select({ session: adminSessionsTable, user: adminUsersTable })
    .from(adminSessionsTable)
    .innerJoin(
      adminUsersTable,
      eq(adminSessionsTable.adminUserId, adminUsersTable.id),
    )
    .where(
      and(
        eq(adminSessionsTable.tokenHash, tokenHash),
        gt(adminSessionsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!rows.length || !rows[0].user.isActive) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "Session expirée ou invalide" });
    return;
  }

  const { user } = rows[0];
  req.adminUser = {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    permissions: getEffectivePermissions(user.role, user.permissions),
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLogin: user.lastLogin,
  };
  next();
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    if (!req.adminUser.permissions.includes(permission)) {
      res.status(403).json({ error: "Permission insuffisante" });
      return;
    }
    next();
  };
}

// ─── Activity logging ────────────────────────────────────────────────────────

export async function logActivity(
  adminUserId: number | null,
  adminName: string,
  action: string,
  entityType: string | null,
  entityId: number | null,
  oldValue: unknown,
  newValue: unknown,
  ipAddress: string,
): Promise<void> {
  try {
    await db.insert(adminActivityLogTable).values({
      adminUserId,
      adminName,
      action,
      entityType,
      entityId,
      oldValue: oldValue != null ? (oldValue as Record<string, unknown>) : null,
      newValue: newValue != null ? (newValue as Record<string, unknown>) : null,
      ipAddress,
    });
  } catch {
    // Non-blocking: never fail the request because of a logging error
  }
}

export function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}
