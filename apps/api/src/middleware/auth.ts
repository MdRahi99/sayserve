import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProd } from "../config/env.js";
import { User, type Role } from "../models/User.js";

export const COOKIE_NAME = "sayserve_token";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; name: string; isDemo: boolean };
    }
  }
}

export function issueToken(res: Response, userId: string, role: Role) {
  const token = jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    domain: env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return token;
}

export function clearToken(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/", domain: env.COOKIE_DOMAIN });
}

/** Attaches req.user when a valid cookie is present. Never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await User.findById(payload.sub).lean();
    if (user) {
      req.user = {
        id: String(user._id), role: user.role as Role,
        name: user.name, isDemo: Boolean(user.isDemo),
      };
    }
  } catch {
    // An expired or tampered cookie is simply not a signed-in user.
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this." });
    }
    next();
  };
}
