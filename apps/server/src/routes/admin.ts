import { Router } from "express";
import { z } from "zod";
import {
  projectSchema, releaseInputSchema, newsletterInputSchema,
  settingsSchema, paginationSchema, idSchema,
} from "@devlog/shared";
import { getDb, type Release, type Newsletter, type User } from "../storage/db.js";
import { newId, nowIso } from "../storage/ids.js";
import {
  parseBody, parse, badRequest, notFound, conflict, HttpError,
} from "../middleware.js";
import { requireAdmin, destroyAllUserSessions, toPublicUser, type AuthedRequest } from "../auth/index.js";
import { handleImageUpload, handleReleaseFileUpload, deleteReleaseFile, uploadSingle } from "../uploads.js";
import fsp from "node:fs/promises";
import path from "node:path";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

/* --------------------------------- overview -------------------------------- */

adminRouter.get("/stats", (_req, res) => {
  const db = getDb();
  const threads = db.threads.get().filter((t) => !t.deleted);
  const replies = db.replies.get().filter((r) => !r.deleted);
  const openReports = db.reports.get().filter((r) => r.status === "open").length;
  res.json({
    project: db.project.get(),
    counts: {
      releases: db.releases.get().length,
      releasesPublished: db.releases.get().filter((r) => r.status === "published").length,
      newsletters: db.newsletters.get().length,
      newslettersPublished: db.newsletters.get().filter((n) => n.status === "published").length,
      users: db.users.get().length,
      threads: threads.length,
      replies: replies.length,
      openReports,
    },
    recent: {
      releases: [...db.releases.get()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
        .map((r) => ({ id: r.id, name: r.name, version: r.version, status: r.status, updatedAt: r.updatedAt })),
      newsletters: [...db.newsletters.get()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
        .map((n) => ({ id: n.id, title: n.title, status: n.status, updatedAt: n.updatedAt })),
    },
    installation: { version: db.installation.get().version, installedAt: db.installation.get().installedAt },
    dataDir: db.dir,
    settings: db.settings.get(),
  });
});

/* --------------------------------- project --------------------------------- */

adminRouter.put("/project", async (req, res) => {
  const body = parseBody(projectSchema, req.body);
  await getDb().project.update((p) => Object.assign(p, body));
  res.json({ project: getDb().project.get() });
});

/* --------------------------------- releases -------------------------------- */

function touchRelease(r: Release, status?: "draft" | "published") {
  r.updatedAt = nowIso();
  if (status === "published" && r.status !== "published") r.publishedAt = nowIso();
  if (status) r.status = status;
}

adminRouter.get("/releases", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const all = [...getDb().releases.get()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), totalPages);
  res.json({ items: all.slice((page - 1) * q.pageSize, page * q.pageSize), total, page, pageSize: q.pageSize, totalPages });
});

adminRouter.get("/releases/:id", (req, res) => {
  const r = getDb().releases.get().find((x) => x.id === req.params.id);
  if (!r) throw notFound("Release not found");
  res.json({ release: r });
});

adminRouter.post("/releases", async (req: AuthedRequest, res) => {
  const body = parseBody(releaseInputSchema, req.body);
  const db = getDb();
  if (body.newsletterId && !db.newsletters.get().some((n) => n.id === body.newsletterId)) {
    throw badRequest("Associated newsletter does not exist");
  }
  const now = nowIso();
  const release: Release = {
    id: newId("rel_"),
    name: body.name,
    version: body.version,
    description: body.description,
    githubUrl: body.githubUrl ?? "",
    newsletterId: body.newsletterId ?? "",
    status: body.status,
    files: [],
    createdAt: now,
    updatedAt: now,
    ...(body.status === "published" ? { publishedAt: now } : {}),
  };
  await db.releases.update((rs) => { rs.push(release); });
  res.status(201).json({ release });
});

adminRouter.put("/releases/:id", async (req, res) => {
  const body = parseBody(releaseInputSchema, req.body);
  const db = getDb();
  const existing = db.releases.get().find((x) => x.id === req.params.id);
  if (!existing) throw notFound("Release not found");
  if (body.newsletterId && !db.newsletters.get().some((n) => n.id === body.newsletterId)) {
    throw badRequest("Associated newsletter does not exist");
  }
  await db.releases.update((rs) => {
    const r = rs.find((x) => x.id === req.params.id)!;
    r.name = body.name;
    r.version = body.version;
    r.description = body.description;
    r.githubUrl = body.githubUrl ?? "";
    r.newsletterId = body.newsletterId ?? "";
    touchRelease(r, body.status);
  });
  res.json({ release: db.releases.get().find((x) => x.id === req.params.id) });
});

adminRouter.patch("/releases/:id/status", async (req, res) => {
  const status = parse(z.enum(["draft", "published"]), req.body?.status);
  const db = getDb();
  if (!db.releases.get().some((x) => x.id === req.params.id)) throw notFound("Release not found");
  await db.releases.update((rs) => {
    const r = rs.find((x) => x.id === req.params.id)!;
    touchRelease(r, status);
  });
  res.json({ release: db.releases.get().find((x) => x.id === req.params.id) });
});

adminRouter.delete("/releases/:id", async (req, res) => {
  const db = getDb();
  const release = db.releases.get().find((x) => x.id === req.params.id);
  if (!release) throw notFound("Release not found");
  // delete files from disk
  for (const f of release.files) {
    await fsp.unlink(path.join(db.dir, "uploads", "releases", path.basename(f.storedName))).catch(() => {});
  }
  await db.releases.update((rs) => rs.filter((x) => x.id !== req.params.id));
  // remove associated threads/replies/reports
  const threadIds = db.threads.get().filter((t) => t.scope === "release" && t.targetId === req.params.id).map((t) => t.id);
  await db.threads.update((ts) => ts.filter((t) => !(t.scope === "release" && t.targetId === req.params.id)));
  await db.replies.update((rs) => rs.filter((r) => !threadIds.includes(r.threadId)));
  await db.reports.update((rs) => rs.filter((r) => !(r.targetType === "thread" && threadIds.includes(r.targetId))));
  res.json({ ok: true });
});

/* ------------------------------ release files ------------------------------ */

adminRouter.post("/releases/:id/files", uploadSingle, handleReleaseFileUpload);
adminRouter.delete("/releases/:id/files/:fileId", deleteReleaseFile);

/* ------------------------------- newsletters -------------------------------- */

adminRouter.get("/newsletters", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const all = [...getDb().newsletters.get()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), totalPages);
  res.json({ items: all.slice((page - 1) * q.pageSize, page * q.pageSize), total, page, pageSize: q.pageSize, totalPages });
});

adminRouter.get("/newsletters/:id", (req, res) => {
  const n = getDb().newsletters.get().find((x) => x.id === req.params.id);
  if (!n) throw notFound("Newsletter not found");
  res.json({ newsletter: n });
});

adminRouter.post("/newsletters", async (req, res) => {
  const body = parseBody(newsletterInputSchema, req.body);
  const now = nowIso();
  const newsletter: Newsletter = {
    id: newId("nl_"),
    title: body.title,
    description: body.description,
    content: body.content,
    imagePath: body.imagePath ?? "",
    status: body.status,
    createdAt: now,
    updatedAt: now,
    ...(body.status === "published" ? { publishedAt: now } : {}),
  };
  await getDb().newsletters.update((ns) => { ns.push(newsletter); });
  res.status(201).json({ newsletter });
});

adminRouter.put("/newsletters/:id", async (req, res) => {
  const body = parseBody(newsletterInputSchema, req.body);
  const db = getDb();
  if (!db.newsletters.get().some((x) => x.id === req.params.id)) throw notFound("Newsletter not found");
  await db.newsletters.update((ns) => {
    const n = ns.find((x) => x.id === req.params.id)!;
    n.title = body.title;
    n.description = body.description;
    n.content = body.content;
    n.imagePath = body.imagePath ?? "";
    n.updatedAt = nowIso();
    if (body.status === "published" && n.status !== "published") n.publishedAt = nowIso();
    n.status = body.status;
  });
  res.json({ newsletter: db.newsletters.get().find((x) => x.id === req.params.id) });
});

adminRouter.patch("/newsletters/:id/status", async (req, res) => {
  const status = parse(z.enum(["draft", "published"]), req.body?.status);
  const db = getDb();
  if (!db.newsletters.get().some((x) => x.id === req.params.id)) throw notFound("Newsletter not found");
  await db.newsletters.update((ns) => {
    const n = ns.find((x) => x.id === req.params.id)!;
    n.updatedAt = nowIso();
    if (status === "published" && n.status !== "published") n.publishedAt = nowIso();
    n.status = status;
  });
  res.json({ newsletter: db.newsletters.get().find((x) => x.id === req.params.id) });
});

adminRouter.delete("/newsletters/:id", async (req, res) => {
  const db = getDb();
  if (!db.newsletters.get().some((x) => x.id === req.params.id)) throw notFound("Newsletter not found");
  await db.newsletters.update((ns) => ns.filter((x) => x.id !== req.params.id));
  const threadIds = db.threads.get().filter((t) => t.scope === "newsletter" && t.targetId === req.params.id).map((t) => t.id);
  await db.threads.update((ts) => ts.filter((t) => !(t.scope === "newsletter" && t.targetId === req.params.id)));
  await db.replies.update((rs) => rs.filter((r) => !threadIds.includes(r.threadId)));
  await db.reports.update((rs) => rs.filter((r) => !(r.targetType === "thread" && threadIds.includes(r.targetId))));
  res.json({ ok: true });
});

/* ---------------------------------- users ---------------------------------- */

adminRouter.get("/users", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const all = [...getDb().users.get()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), totalPages);
  res.json({
    items: all.slice((page - 1) * q.pageSize, page * q.pageSize).map(toPublicUser),
    total, page, pageSize: q.pageSize, totalPages,
  });
});

adminRouter.patch("/users/:id", async (req: AuthedRequest, res) => {
  const body = parseBody(z.object({ status: z.enum(["active", "suspended"]) }), req.body);
  const db = getDb();
  const target = db.users.get().find((u) => u.id === req.params.id);
  if (!target) throw notFound("User not found");
  if (target.role === "admin" && body.status === "suspended" && req.user!.id === target.id) {
    throw badRequest("You cannot suspend your own admin account");
  }
  await db.users.update((users) => {
    const u = users.find((x) => x.id === target.id)!;
    u.status = body.status;
  });
  if (body.status === "suspended") await destroyAllUserSessions(target.id);
  res.json({ user: toPublicUser(db.users.get().find((u) => u.id === target.id)!) });
});

adminRouter.delete("/users/:id", async (req: AuthedRequest, res) => {
  const db = getDb();
  const target = db.users.get().find((u) => u.id === req.params.id);
  if (!target) throw notFound("User not found");
  const admins = db.users.get().filter((u) => u.role === "admin" && u.status === "active");
  if (target.role === "admin" && admins.length <= 1) {
    throw badRequest("Cannot delete the last administrator account");
  }
  if (target.id === req.user!.id) throw badRequest("You cannot delete your own account here");
  await db.users.update((users) => users.filter((u) => u.id !== target.id));
  await destroyAllUserSessions(target.id);
  // anonymize their content rather than deleting threads
  await db.threads.update((ts) => ts.forEach((t) => {
    if (t.authorId === target.id) { t.authorUsername = "[deleted user]"; }
  }));
  await db.replies.update((rs) => rs.forEach((r) => {
    if (r.authorId === target.id) { r.authorUsername = "[deleted user]"; }
  }));
  res.json({ ok: true });
});

/* ------------------------------- moderation -------------------------------- */

adminRouter.get("/threads", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const scope = req.query.scope ? discussionScopeSchemaSafe(req.query.scope) : undefined;
  const all = [...getDb().threads.get()]
    .filter((t) => !t.deleted && (!scope || t.scope === scope))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), totalPages);
  res.json({ items: all.slice((page - 1) * q.pageSize, page * q.pageSize), total, page, pageSize: q.pageSize, totalPages });
});

adminRouter.patch("/threads/:id/lock", async (req, res) => {
  const locked = parse(z.boolean(), req.body?.locked);
  const db = getDb();
  if (!db.threads.get().some((t) => t.id === req.params.id)) throw notFound("Thread not found");
  await db.threads.update((ts) => {
    const t = ts.find((x) => x.id === req.params.id)!;
    t.locked = locked;
    t.updatedAt = nowIso();
  });
  res.json({ thread: db.threads.get().find((t) => t.id === req.params.id) });
});

adminRouter.delete("/threads/:id", async (req, res) => {
  const db = getDb();
  if (!db.threads.get().some((t) => t.id === req.params.id)) throw notFound("Thread not found");
  await db.threads.update((ts) => {
    const t = ts.find((x) => x.id === req.params.id)!;
    t.deleted = true;
  });
  await db.reports.update((rs) => rs.forEach((r) => {
    if (r.targetId === req.params.id) r.status = "resolved";
  }));
  res.json({ ok: true });
});

adminRouter.delete("/replies/:id", async (req, res) => {
  const db = getDb();
  const reply = db.replies.get().find((r) => r.id === req.params.id && !r.deleted);
  if (!reply) throw notFound("Reply not found");
  await db.replies.update((rs) => {
    const r = rs.find((x) => x.id === reply.id)!;
    r.deleted = true;
  });
  await db.reports.update((rs) => rs.forEach((r) => {
    if (r.targetId === reply.id) r.status = "resolved";
  }));
  res.json({ ok: true });
});

adminRouter.get("/reports", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const status = typeof req.query.status === "string" ? req.query.status : "open";
  const all = [...getDb().reports.get()]
    .filter((r) => status === "all" || r.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), totalPages);
  // attach target preview
  const threads = getDb().threads.get();
  const replies = getDb().replies.get();
  const items = all.slice((page - 1) * q.pageSize, page * q.pageSize).map((r) => {
    const target = r.targetType === "thread"
      ? threads.find((t) => t.id === r.targetId)
      : replies.find((x) => x.id === r.targetId);
    return { ...r, targetPreview: target ? ("title" in target ? target.title : target.content.slice(0, 140)) : "[deleted]" };
  });
  res.json({ items, total, page, pageSize: q.pageSize, totalPages });
});

adminRouter.patch("/reports/:id", async (req: AuthedRequest, res) => {
  const body = parseBody(z.object({ status: z.enum(["open", "resolved", "dismissed"]) }), req.body);
  const db = getDb();
  const report = db.reports.get().find((r) => r.id === req.params.id);
  if (!report) throw notFound("Report not found");
  await db.reports.update((rs) => {
    const r = rs.find((x) => x.id === report.id)!;
    r.status = body.status;
    if (body.status !== "open") { r.resolvedBy = req.user!.id; r.resolvedAt = nowIso(); }
  });
  res.json({ report: db.reports.get().find((r) => r.id === report.id) });
});

/* --------------------------------- settings -------------------------------- */

adminRouter.get("/settings", (_req, res) => {
  res.json({ settings: getDb().settings.get(), security: getDb().security.get() });
});

adminRouter.put("/settings", async (req, res) => {
  const body = parseBody(settingsSchema, req.body);
  await getDb().settings.update((s) => Object.assign(s, body));
  res.json({ settings: getDb().settings.get() });
});

/* --------------------------------- uploads --------------------------------- */

adminRouter.post("/uploads/image", uploadSingle, handleImageUpload);

function discussionScopeSchemaSafe(v: unknown) {
  return v === "release" || v === "newsletter" ? v : undefined;
}
