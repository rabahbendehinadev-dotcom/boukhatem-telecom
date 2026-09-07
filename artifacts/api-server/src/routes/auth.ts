import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, password requis" });
    return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email déjà utilisé" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, phone, role: "customer" }).returning();
  const token = signToken(user.id, user.role);
  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBlocked: user.isBlocked, totalOrders: 0, totalSpent: 0, createdAt: user.createdAt.toISOString() },
    token,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email et password requis" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }
  if (user.isBlocked) {
    res.status(403).json({ error: "Compte bloqué" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }
  const token = signToken(user.id, user.role);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBlocked: user.isBlocked, totalOrders: 0, totalSpent: 0, createdAt: user.createdAt.toISOString() },
    token,
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Déconnecté" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBlocked: user.isBlocked, totalOrders: 0, totalSpent: 0, createdAt: user.createdAt.toISOString() });
});

router.patch("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { name, email, phone } = req.body;
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (phone) updates.phone = phone;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!user) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBlocked: user.isBlocked, totalOrders: 0, totalSpent: 0, createdAt: user.createdAt.toISOString() });
});

export default router;
