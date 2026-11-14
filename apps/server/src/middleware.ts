import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import { hmac, randomToken, sha256 } from "./storage/ids.js";

export const CSRF_COOKIE = "devlog_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function sign(token: string): string {
  return hmac(token, config.sessionSecret);
}

/** Issue (or refresh) the CSRF cookie. Call on GET requests. */
export function issueCsrf(req: Request, res: Response) {
  const existing = req.cookies?.[CSRF_COOKIE] as string | undefined;
  if (existing) {
    const [tok, sig] = existing.split(".");
    if (tok && sig && sign(tok) === sig) return; // still valid
  }
  const token = randomToken(24);
  const value = `${token}.${sign(token)}`;
  res.cookie(CSRF_COOKIE, value, {
    httpOnly: false, // must be readable by the SPA
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
  });
}

/**
 * Double-submit CSRF protection: for unsafe methods, the X-CSRF-Token header
 * must equal the signed csrf cookie value.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const header = req.headers["x-csrf-token"] as string | undefined;
  if (!cookie || !header || cookie !== header) {
    res.status(403).json({ error: { code: "csrf_failed", message: "CSRF token missing or invalid" } });
    return;
  }
  const [tok, sig] = cookie.split(".");
  if (!tok || !sig || sign(tok) !== sig) {
    res.status(403).json({ error: { code: "csrf_failed", message: "CSRF token invalid" } });
    return;
  }
  next();
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function badRequest(msg: string, details?: unknown) { return new HttpError(400, "bad_request", msg, details); }
export function unauthorized(msg = "Authentication required") { return new HttpError(401, "unauthorized", msg); }
export function forbidden(msg = "Forbidden") { return new HttpError(403, "forbidden", msg); }
export function notFound(msg = "Not found") { return new HttpError(404, "not_found", msg); }
export function conflict(msg: string) { return new HttpError(409, "conflict", msg); }
export function tooMany(msg = "Too many requests") { return new HttpError(429, "rate_limited", msg); }

export function zodError(err: unknown): HttpError {
  const e = err as { issues?: { path: (string | number)[]; message: string }[] };
  const details = (e.issues ?? []).map((i) => ({ path: i.path.join("."), message: i.message }));
  return new HttpError(400, "validation_error", "Validation failed", details);
}

export function parseBody<S extends import("zod").ZodTypeAny>(schema: S, body: unknown): import("zod").infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) throw zodError(result.error);
  return result.data;
}

/** Same as parseBody — alias for query/param parsing. */
export const parse = parseBody;

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) } });
    return;
  }
  const multerErr = err as { code?: string; message?: string };
  if (multerErr?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: { code: "file_too_large", message: "Uploaded file exceeds the size limit" } });
    return;
  }
  if (multerErr?.code === "LIMIT_UNEXPECTED_FILE") {
    res.status(400).json({ error: { code: "bad_upload", message: "Unexpected file field" } });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({ error: { code: "internal_error", message: "Internal server error" } });
}
