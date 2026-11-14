import { hash, verify } from "@node-rs/argon2";
import { getDb, type User, type PublicUser } from "../storage/db.js";
import { newId, nowIso, randomToken, sha256 } from "../storage/ids.js";
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../middleware.js";

const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const; // ~19 MiB, argon2id

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export async function verifyPassword(hashStr: string, password: string): Promise<boolean> {
  try {
    return await verify(hashStr, password);
  } catch {
    return false;
  }
}

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

/* --------------------------------- sessions -------------------------------- */

export const SESSION_COOKIE = "devlog_session";

export interface SessionInfo {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

export async function createSession(userId: string, req: Request, res: Response): Promise<SessionInfo> {
  const db = getDb();
  const settings = db.settings.get();
  const token = randomToken(32);
  const now = Date.now();
  const ttlMs = settings.sessionTtlDays * 24 * 3600 * 1000;
  const idleMs = settings.sessionIdleHours * 3600 * 1000;
  const expiresAt = new Date(now + ttlMs);

  const session = {
    id: sha256(token),
    userId,
    createdAt: nowIso(),
    expiresAt: expiresAt.toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    userAgent: (req.headers["user-agent"] ?? "").slice(0, 300),
    ip: req.ip ?? "",
  };
  await db.sessions.update((s) => { s.push(session); });
  // Opportunistic cleanup of expired sessions
  if (db.sessions.get().length > 5000) {
    await db.sessions.update((s) => s.filter((x) => new Date(x.expiresAt).getTime() > now));
  }

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.app.get("cookieSecure") === true,
    path: "/",
    expires: expiresAt,
  });
  return { token, sessionId: session.id, expiresAt };
}

export async function destroySession(token: string | undefined, res: Response): Promise<void> {
  const db = getDb();
  if (!token) return;
  const id = sha256(token);
  await db.sessions.update((s) => s.filter((x) => x.id !== id));
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  const db = getDb();
  await db.sessions.update((s) => s.filter((x) => x.userId !== userId));
}

export function readSessionToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[SESSION_COOKIE];
}

/* ------------------------------- middleware -------------------------------- */

export interface AuthedRequest extends Request {
  user?: PublicUser;
}

export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = readSessionToken(req);
    if (token) {
      const db = getDb();
      const id = sha256(token);
      const session = db.sessions.get().find((s) => s.id === id);
      if (session) {
        const now = Date.now();
        const expires = new Date(session.expiresAt).getTime();
        const idle = new Date(session.lastSeenAt).getTime() + db.settings.get().sessionIdleHours * 3600 * 1000;
        if (expires > now && idle > now) {
          const user = db.users.get().find((u) => u.id === session.userId);
          if (user && user.status === "active") {
            req.user = toPublicUser(user);
            // Throttled lastSeen update (at most once per minute)
            if (now - new Date(session.lastSeenAt).getTime() > 60_000) {
              db.sessions.mutate((s) => {
                const s2 = s.find((x) => x.id === id);
                if (s2) s2.lastSeenAt = new Date(now).toISOString();
              });
            }
          }
        }
      }
    }
  } catch {
    // never block requests on auth lookup errors
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: { code: "unauthorized", message: "Authentication required" } });
    return;
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: { code: "unauthorized", message: "Authentication required" } });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: { code: "forbidden", message: "Administrator access required" } });
    return;
  }
  next();
}

export async function registerUser(username: string, password: string, role: "admin" | "user"): Promise<User> {
  const db = getDb();
  const usernameLower = username.toLowerCase();
  if (db.users.get().some((u) => u.usernameLower === usernameLower)) {
    throw new HttpError(409, "username_taken", "Username is already taken");
  }
  const user: User = {
    id: newId("usr_"),
    username,
    usernameLower,
    passwordHash: await hashPassword(password),
    role,
    status: "active",
    createdAt: nowIso(),
  };
  await db.users.update((users) => { users.push(user); });
  return user;
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const lower = username.toLowerCase();
  return getDb().users.get().find((u) => u.usernameLower === lower);
}
