import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncRoute, HttpError } from "../middleware/errors.js";
import { attachUser, clearToken, issueToken, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/User.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8, "Use at least 8 characters."),
  phone: z.string().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const publicUser = (u: { _id: unknown; name: string; email: string; role: string; phone?: string; isDemo?: boolean }) => ({
  id: String(u._id), name: u.name, email: u.email,
  role: u.role, phone: u.phone ?? "", isDemo: Boolean(u.isDemo),
});

router.post("/register", validate(registerSchema), asyncRoute(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.exists({ email: email.toLowerCase() })) {
    throw new HttpError(409, "That email is already registered.");
  }
  const user = await User.create({
    name, email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    phone: phone ?? "",
  });
  issueToken(res, String(user._id), "customer");
  res.status(201).json({ user: publicUser(user) });
}));

router.post("/login", validate(loginSchema), asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  // Same message either way: never reveal which half was wrong.
  const bad = new HttpError(401, "Email or password is not right.");
  if (!user) throw bad;
  if (!(await bcrypt.compare(password, user.passwordHash))) throw bad;

  issueToken(res, String(user._id), user.role);
  res.json({ user: publicUser(user) });
}));

router.post("/logout", (_req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

router.get("/me", attachUser, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not signed in." });
  res.json({ user: req.user });
});

/**
 * One-click demo. Every visitor gets their own throwaway account with a role,
 * so a recruiter can open the kitchen board without a password. The TTL index
 * on expiresAt deletes the sandbox a day later.
 */
router.post("/demo", validate(z.object({ role: z.enum(["customer", "staff"]) })),
  asyncRoute(async (req, res) => {
    const role = req.body.role as "customer" | "staff";
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const user = await User.create({
      name: role === "staff" ? "Demo staff" : "Demo customer",
      email: `demo-${stamp}@sayserve.local`,
      passwordHash: await bcrypt.hash(stamp, 8),
      role,
      isDemo: true,
      expiresAt: new Date(Date.now() + env.DEMO_TTL_HOURS * 3600 * 1000),
    });
    issueToken(res, String(user._id), role);
    res.status(201).json({ user: publicUser(user), expiresInHours: env.DEMO_TTL_HOURS });
  }));

router.patch("/me", attachUser, requireAuth, validate(z.object({
  name: z.string().min(1).max(80).optional(),
  phone: z.string().max(30).optional(),
  savedAddress: z.object({
    line1: z.string().max(120).optional(),
    line2: z.string().max(120).optional(),
    postcode: z.string().max(12).optional(),
    notes: z.string().max(200).optional(),
  }).optional(),
})), asyncRoute(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user!.id, req.body, { new: true });
  if (!user) throw new HttpError(404, "Account not found.");
  res.json({ user: publicUser(user) });
}));

export default router;
