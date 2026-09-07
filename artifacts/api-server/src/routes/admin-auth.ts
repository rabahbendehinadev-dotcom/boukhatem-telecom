import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, and, gt, lt } from "drizzle-orm";
import {
  db,
  adminUsersTable,
  adminSessionsTable,
  adminLoginAttemptsTable,
} from "@workspace/db";
import {
  requireAdminSession,
  generateSessionToken,
  hashToken,
  setCookieOptions,
  COOKIE_NAME,
  getEffectivePermissions,
  logActivity,
  getIp,
} from "../lib/admin-auth";

const router: IRouter = Router();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min after 5 attempts
const HARD_LOCKOUT_ATTEMPTS = 10;
const HARD_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour after 10 attempts

async function checkRateLimit(
  identifier: string,
): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const now = new Date();
  const rows = await db
    .select()
    .from(adminLoginAttemptsTable)
    .where(eq(adminLoginAttemptsTable.identifier, identifier))
    .limit(1);

  if (!rows.length) return { locked: false };
  const record = rows[0];

  if (record.lockedUntil && record.lockedUntil > now) {
    return { locked: true, lockedUntil: record.lockedUntil };
  }
  return { locked: false };
}

async function recordFailedAttempt(identifier: string): Promise<void> {
  const now = new Date();
  const rows = await db
    .select()
    .from(adminLoginAttemptsTable)
    .where(eq(adminLoginAttemptsTable.identifier, identifier))
    .limit(1);

  if (!rows.length) {
    await db.insert(adminLoginAttemptsTable).values({
      identifier,
      attempts: 1,
      updatedAt: now,
    });
    return;
  }

  const record = rows[0];
  const newAttempts = record.attempts + 1;
  let lockedUntil: Date | null = null;

  if (newAttempts >= HARD_LOCKOUT_ATTEMPTS) {
    lockedUntil = new Date(now.getTime() + HARD_LOCKOUT_MS);
  } else if (newAttempts >= MAX_ATTEMPTS) {
    lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
  }

  await db
    .update(adminLoginAttemptsTable)
    .set({ attempts: newAttempts, lockedUntil, updatedAt: now })
    .where(eq(adminLoginAttemptsTable.identifier, identifier));
}

async function clearAttempts(identifier: string): Promise<void> {
  await db
    .update(adminLoginAttemptsTable)
    .set({ attempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(adminLoginAttemptsTable.identifier, identifier));
}

// POST /api/admin/auth/login
router.post("/admin/auth/login", async (req, res): Promise<void> => {
  const { email, password, rememberMe } = req.body as {
    email?: string;
    password?: string;
    rememberMe?: boolean;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }

  const ip = getIp(req);
  const identifier = `${email.toLowerCase()}:${ip}`;
  const genericError = "Email ou mot de passe incorrect";

  // Rate limit check
  const rateCheck = await checkRateLimit(identifier);
  if (rateCheck.locked) {
    const waitMin = Math.ceil(
      (rateCheck.lockedUntil!.getTime() - Date.now()) / 60000,
    );
    res.status(429).json({
      error: `Trop de tentatives. Réessayez dans ${waitMin} minute(s).`,
    });
    return;
  }

  // Look up user — use same error message regardless of whether email exists
  const users = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email.toLowerCase()))
    .limit(1);

  if (!users.length) {
    await recordFailedAttempt(identifier);
    res.status(401).json({ error: genericError });
    return;
  }

  const adminUser = users[0];

  if (!adminUser.isActive) {
    await recordFailedAttempt(identifier);
    res.status(401).json({ error: genericError });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, adminUser.passwordHash);
  if (!passwordMatch) {
    await recordFailedAttempt(identifier);
    res.status(401).json({ error: genericError });
    return;
  }

  // Success — clear rate limit, create session
  await clearAttempts(identifier);

  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() +
      (rememberMe ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
  );

  await db.insert(adminSessionsTable).values({
    adminUserId: adminUser.id,
    tokenHash,
    expiresAt,
    ipAddress: ip,
    userAgent: req.headers["user-agent"] ?? null,
  });

  // Update last login
  await db
    .update(adminUsersTable)
    .set({ lastLogin: now, lastLoginIp: ip, updatedAt: now })
    .where(eq(adminUsersTable.id, adminUser.id));

  // Log activity
  await logActivity(
    adminUser.id,
    adminUser.fullName,
    "login",
    null,
    null,
    null,
    null,
    ip,
  );

  res.cookie(COOKIE_NAME, token, setCookieOptions(!!rememberMe));

  res.json({
    id: adminUser.id,
    fullName: adminUser.fullName,
    username: adminUser.username,
    email: adminUser.email,
    role: adminUser.role,
    permissions: getEffectivePermissions(adminUser.role, adminUser.permissions),
    isActive: adminUser.isActive,
    mustChangePassword: adminUser.mustChangePassword,
    lastLogin: adminUser.lastLogin?.toISOString() ?? null,
  });
});

// POST /api/admin/auth/logout
router.post(
  "/admin/auth/logout",
  requireAdminSession,
  async (req, res): Promise<void> => {
    const token = req.cookies?.[COOKIE_NAME] as string;
    if (token) {
      const tokenHash = hashToken(token);
      await db
        .delete(adminSessionsTable)
        .where(eq(adminSessionsTable.tokenHash, tokenHash));
      await logActivity(
        req.adminUser!.id,
        req.adminUser!.fullName,
        "logout",
        null,
        null,
        null,
        null,
        getIp(req),
      );
    }
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  },
);

// GET /api/admin/auth/me
router.get(
  "/admin/auth/me",
  requireAdminSession,
  (req, res): void => {
    const u = req.adminUser!;
    res.json({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      role: u.role,
      permissions: u.permissions,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      lastLogin: u.lastLogin?.toISOString() ?? null,
    });
  },
);

// POST /api/admin/auth/change-password
router.post(
  "/admin/auth/change-password",
  requireAdminSession,
  async (req, res): Promise<void> => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Données manquantes" });
      return;
    }
    if (newPassword.length < 8) {
      res
        .status(400)
        .json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères" });
      return;
    }

    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, req.adminUser!.id));

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "Mot de passe actuel incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(adminUsersTable)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(adminUsersTable.id, req.adminUser!.id));

    await logActivity(
      req.adminUser!.id,
      req.adminUser!.fullName,
      "change_password",
      "admin_user",
      req.adminUser!.id,
      null,
      null,
      getIp(req),
    );

    res.json({ ok: true });
  },
);

// Clean up expired sessions periodically (called on login)
async function pruneExpiredSessions(): Promise<void> {
  try {
    await db
      .delete(adminSessionsTable)
      .where(lt(adminSessionsTable.expiresAt, new Date()));
  } catch {
    // Non-blocking
  }
}

// Run prune every hour via setInterval on module load
setInterval(pruneExpiredSessions, 60 * 60 * 1000);

export default router;
