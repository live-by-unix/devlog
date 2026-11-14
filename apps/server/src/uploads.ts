import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import type { Request, Response } from "express";
import { getDb } from "./storage/db.js";
import { newId, nowIso } from "./storage/ids.js";
import { badRequest, forbidden, notFound, HttpError } from "./middleware.js";

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"]);

// Block obviously dangerous extensions anywhere.
const BLOCKED_EXTS = new Set([".exe", ".bat", ".cmd", ".com", ".scr", ".pif", ".msi", ".dll", ".so", ".dylib", ".sh", ".bash", ".ps1", ".vbs", ".js", ".mjs", ".ts", ".py", ".rb", ".pl"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 * 1024, files: 1 },
});

function maxBytes(kind: "image" | "file"): number {
  const s = getDb().settings.get();
  const mb = kind === "image" ? s.maxImageMb : s.maxUploadMb;
  return mb * 1024 * 1024;
}

function safeExt(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().slice(0, 16);
  if (!ext || ext.length > 10 || /[^a-z0-9.]/.test(ext)) return "";
  return ext;
}

function assertSize(file: Express.Multer.File, kind: "image" | "file") {
  const limit = maxBytes(kind);
  if (file.size > limit) {
    throw new HttpError(413, "file_too_large", `File exceeds the ${Math.floor(limit / 1024 / 1024)} MB limit`);
  }
}

function magicOk(file: Express.Multer.File): boolean {
  const b = file.buffer.subarray(0, 12);
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const isJpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isGif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
  const isWebp = b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
  const isIco = b.toString("ascii", 0, 4) === "\x00\x00\x01\x00";
  const isSvg = file.mimetype === "image/svg+xml" && file.buffer.toString("utf8", 0, 200).includes("<svg");
  return isPng || isJpg || isGif || isWebp || isIco || isSvg;
}

export const uploadSingle = upload.single("file");

/** POST /api/v1/uploads/image?kind=favicon|project|newsletter — admin only */
export async function handleImageUpload(req: Request, res: Response) {
  if (!req.file) throw badRequest("No file uploaded (field name: file)");
  const kind = String(req.query.kind ?? "project");
  if (!["favicon", "project", "newsletter"].includes(kind)) throw badRequest("Invalid image kind");
  const file = req.file;
  assertSize(file, "image");
  const ext = safeExt(file.originalname);
  if (!IMAGE_EXTS.has(ext) && !IMAGE_MIMES.has(file.mimetype)) {
    throw badRequest("Unsupported image type. Allowed: png, jpg, gif, webp, svg, ico");
  }
  if (!IMAGE_MIMES.has(file.mimetype) || !magicOk(file)) {
    throw badRequest("File content does not match an allowed image type");
  }
  // Sanitize SVG: strip scripts/handlers by rejecting active content
  if (file.mimetype === "image/svg+xml") {
    const text = file.buffer.toString("utf8").toLowerCase();
    if (/<script|onload=|onerror=|javascript:|<foreignobject/.test(text)) {
      throw badRequest("SVG contains active content and was rejected");
    }
  }
  const storedName = `${newId("img_")}${ext || ".png"}`;
  const rel = path.join("uploads", kind, storedName);
  const abs = path.join(getDb().dir, rel);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, file.buffer, { mode: 0o600 });
  res.json({ path: rel.replace(/\\/g, "/") });
}

/** Attach a downloadable file to a release. */
export async function handleReleaseFileUpload(req: Request, res: Response) {
  if (!req.file) throw badRequest("No file uploaded (field name: file)");
  const releaseId = req.params.id;
  const db = getDb();
  const release = db.releases.get().find((r) => r.id === releaseId);
  if (!release) throw notFound("Release not found");
  const file = req.file;
  assertSize(file, "file");
  const ext = safeExt(file.originalname);
  if (ext && BLOCKED_EXTS.has(ext)) {
    throw badRequest(`File type ${ext} is not allowed for security reasons`);
  }
  const storedName = `${newId("file_")}${ext}`;
  const absDir = path.join(db.dir, "uploads", "releases");
  await fsp.mkdir(absDir, { recursive: true });
  await fsp.writeFile(path.join(absDir, storedName), file.buffer, { mode: 0o600 });

  const meta = {
    id: newId("rf_"),
    displayName: file.originalname.slice(0, 300) || storedName,
    storedName,
    size: file.size,
    mimeType: file.mimetype || "application/octet-stream",
    permission: (req.body?.permission === "users" ? "users" : "everyone") as "everyone" | "users",
    uploadedAt: nowIso(),
    uploadedBy: (req as { user?: { id: string } }).user?.id ?? "",
  };
  await db.releases.update((rs) => {
    const r = rs.find((x) => x.id === releaseId);
    if (r) r.files.push(meta);
  });
  res.status(201).json({ file: meta });
}

export async function deleteReleaseFile(req: Request, res: Response) {
  const db = getDb();
  const release = db.releases.get().find((r) => r.id === req.params.id);
  if (!release) throw notFound("Release not found");
  const fileId = req.params.fileId;
  const file = release.files.find((f) => f.id === fileId);
  if (!file) throw notFound("File not found");
  const abs = path.join(db.dir, "uploads", "releases", path.basename(file.storedName));
  await fsp.unlink(abs).catch(() => {});
  await db.releases.update((rs) => {
    const r = rs.find((x) => x.id === req.params.id);
    if (r) r.files = r.files.filter((f) => f.id !== fileId);
  });
  res.json({ ok: true });
}

/**
 * Serve a public asset (images). Release downloads go through
 * /api/v1/releases/:id/files/:fileId/download with permission checks.
 */
export async function serveMedia(req: Request, res: Response) {
  const rel = String(req.params[0] ?? "");
  // Only allow files under uploads/{favicon,project,newsletters}
  const m = rel.match(/^uploads\/(favicon|project|newsletters)\/([A-Za-z0-9_.-]+)$/);
  if (!m) throw forbidden("Invalid media path");
  const abs = path.join(getDb().dir, "uploads", m[1], path.basename(m[2]));
  if (!fs.existsSync(abs)) throw notFound("File not found");
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".gif" ? "image/gif" :
    ext === ".webp" ? "image/webp" :
    ext === ".svg" ? "image/svg+xml" :
    ext === ".ico" ? "image/x-icon" : "application/octet-stream";
  res.setHeader("Content-Type", mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  // For SVG, force attachment-safe rendering is already handled by CSP; send as-is
  fs.createReadStream(abs).pipe(res);
}

export async function downloadReleaseFile(req: Request, res: Response) {
  const db = getDb();
  const release = db.releases.get().find((r) => r.id === req.params.id);
  if (!release || release.status !== "published") throw notFound("Release not found");
  const file = release.files.find((f) => f.id === req.params.fileId);
  if (!file) throw notFound("File not found");
  if (file.permission === "users" && !(req as { user?: unknown }).user) {
    throw new HttpError(401, "unauthorized", "Sign in to download this file");
  }
  const abs = path.join(db.dir, "uploads", "releases", path.basename(file.storedName));
  if (!fs.existsSync(abs)) throw notFound("File missing on disk");
  const safeName = file.displayName.replace(/[^\w.\- ()\[\]]+/g, "_").slice(0, 200) || file.storedName;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  fs.createReadStream(abs).pipe(res);
}

