import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const _rawSessionSecret = process.env.SESSION_SECRET;
if (!_rawSessionSecret) {
  throw new Error(
    "SESSION_SECRET environment variable is required but was not set. " +
      "Generate one with: openssl rand -hex 64",
  );
}
const JWT_SECRET: string = _rawSessionSecret;

export function signToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; role: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(auth.slice(7));
    (req as any).userId = payload.userId;
    (req as any).userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const role = (req as any).userRole;
    if (role !== "admin" && role !== "staff") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(auth.slice(7));
      (req as any).userId = payload.userId;
      (req as any).userRole = payload.role;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
