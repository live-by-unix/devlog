import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { registerSchema, loginSchema, passwordSchema } from "@devlog/shared";
import { getDb, isInitialized } from "../storage/db.js";
import {
  createSession, destroySession, destroyAllUserSessions, findUserByUsername,
  hashPassword, registerUser, readSessionToken, verifyPassword, toPublicUser,
  requireAuth, type AuthedRequest,
} from "../auth/index.js";
import { parseBody, badRequest, unauthorized, HttpError } from "../middleware.js";
import { nowIso } from "../storage/ids.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many login attempts. Try again later." } },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many registration attempts. Try again later." } },
});

authRouter.post("/register", registerLimiter, async (req: AuthedRequest, res) => {
  if (!isInitialized()) throw badRequest("Setup has not been completed yet");
  const body = parseBody(registerSchema, req.body);
  // Public registration can never create admins
  const user = await registerUser(body.username, body.password, "user");
  await createSession(user.id, req, res);
  res.status(201).json({ user: toPublicUser(user) });
});

authRouter.post("/login", loginLimiter, async (req: AuthedRequest, res) => {
  const body = parseBody(loginSchema, req.body);
  const user = await findUserByUsername(body.username);
  if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
    throw unauthorized("Invalid username or password");
  }
  if (user.status === "suspended") {
    throw new HttpError(403, "account_suspended", "This account has been suspended");
  }
  await getDb().users.update((users) => {
    const u = users.find((x) => x.id === user.id);
    if (u) u.lastLoginAt = nowIso();
  });
  await createSession(user.id, req, res);
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/logout", async (req, res) => {
  await destroySession(readSessionToken(req), res);
  res.json({ ok: true });
});

authRouter.get("/me", (req: AuthedRequest, res) => {
  res.json({ user: req.user ?? null });
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

authRouter.post("/password", requireAuth, async (req: AuthedRequest, res) => {
  const body = parseBody(passwordChangeSchema, req.body);
  const db = getDb();
  const user = db.users.get().find((u) => u.id === req.user!.id);
  if (!user) throw unauthorized();
  if (!(await verifyPassword(user.passwordHash, body.currentPassword))) {
    throw unauthorized("Current password is incorrect");
  }
  const hashStr = await hashPassword(body.newPassword);
  await db.users.update((users) => {
    const u = users.find((x) => x.id === req.user!.id);
    if (u) u.passwordHash = hashStr;
  });
  // Invalidate all sessions, then create a fresh one for this browser
  await destroyAllUserSessions(req.user!.id);
  await createSession(req.user!.id, req, res);
  res.json({ ok: true });
});
