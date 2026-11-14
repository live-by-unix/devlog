import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  threadCreateSchema, replyCreateSchema, postEditSchema,
  reportCreateSchema, paginationSchema, discussionScopeSchema, idSchema,
} from "@devlog/shared";
import { getDb, type Thread, type Reply } from "../storage/db.js";
import { newId, nowIso } from "../storage/ids.js";
import {
  parseBody, parse, badRequest, notFound, forbidden, HttpError,
} from "../middleware.js";
import { requireAuth, type AuthedRequest } from "../auth/index.js";

export const discussionsRouter = Router();

const postLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "You're posting too fast. Slow down." } },
});

const MAX_DEPTH = 4;

function targetExists(scope: "release" | "newsletter", targetId: string): boolean {
  const db = getDb();
  if (scope === "release") {
    const r = db.releases.get().find((x) => x.id === targetId);
    return !!r && r.status === "published";
  }
  const n = db.newsletters.get().find((x) => x.id === targetId);
  return !!n && n.status === "published";
}

function depthOf(reply: Reply, replies: Reply[]): number {
  let depth = 0;
  let cur: Reply | undefined = reply;
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = replies.find((r) => r.id === cur!.parentId);
    depth++;
    if (depth > 20) break;
  }
  return depth;
}

/** Build nested reply tree (deleted posts become placeholders). */
function buildTree(replies: Reply[]): (Reply & { children: Reply[] })[] {
  const map = new Map<string, Reply & { children: (Reply & { children: Reply[] })[] }>();
  const roots: (Reply & { children: (Reply & { children: Reply[] })[] })[] = [];
  for (const r of replies) map.set(r.id, { ...r, children: [] });
  for (const r of map.values()) {
    if (r.parentId && map.has(r.parentId)) map.get(r.parentId)!.children.push(r);
    else roots.push(r);
  }
  const sortRec = (list: (Reply & { children: Reply[] })[]) => {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    list.forEach((x) => sortRec(x.children as (Reply & { children: Reply[] })[]));
  };
  sortRec(roots);
  return roots;
}

/* ------------------------------ public reads ------------------------------- */

discussionsRouter.get("/threads", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const scope = parse(discussionScopeSchema, req.query.scope);
  const targetId = parse(idSchema, req.query.targetId);
  const db = getDb();
  if (!targetExists(scope, targetId)) throw notFound("Discussion target not found");
  const all = db.threads.get()
    .filter((t) => t.scope === scope && t.targetId === targetId && !t.deleted)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(Math.max(1, q.page), totalPages);
  res.json({
    items: all.slice((page - 1) * q.pageSize, page * q.pageSize),
    total, page, pageSize: q.pageSize, totalPages,
  });
});

discussionsRouter.get("/threads/:id", (req, res) => {
  const db = getDb();
  const thread = db.threads.get().find((t) => t.id === req.params.id && !t.deleted);
  if (!thread) throw notFound("Thread not found");
  const replies = db.replies.get().filter((r) => r.threadId === thread.id && !r.deleted);
  res.json({ thread, replies: buildTree(replies) });
});

/* ------------------------------ writes (auth) ------------------------------ */

discussionsRouter.post("/threads", postLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const body = parseBody(threadCreateSchema, req.body);
  const db = getDb();
  if (!targetExists(body.scope, body.targetId)) throw notFound("Discussion target not found");
  const thread: Thread = {
    id: newId("th_"),
    scope: body.scope,
    targetId: body.targetId,
    title: body.title.trim(),
    content: body.content,
    authorId: req.user!.id,
    authorUsername: req.user!.username,
    locked: false,
    deleted: false,
    replyCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.threads.update((ts) => { ts.push(thread); });
  res.status(201).json({ thread });
});

discussionsRouter.post("/threads/:id/replies", postLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const body = parseBody(replyCreateSchema, req.body);
  const db = getDb();
  const thread = db.threads.get().find((t) => t.id === req.params.id && !t.deleted);
  if (!thread) throw notFound("Thread not found");
  if (thread.locked && req.user!.role !== "admin") {
    throw new HttpError(403, "thread_locked", "This thread is locked");
  }
  let parentId = "";
  if (body.parentId) {
    const parent = db.replies.get().find((r) => r.id === body.parentId && r.threadId === thread.id && !r.deleted);
    if (!parent) throw badRequest("Parent reply not found");
    const allReplies = db.replies.get().filter((r) => r.threadId === thread.id);
    if (depthOf(parent, allReplies) + 1 > MAX_DEPTH) {
      throw badRequest(`Replies may be nested at most ${MAX_DEPTH} levels deep`);
    }
    parentId = parent.id;
  }
  const reply: Reply = {
    id: newId("rp_"),
    threadId: thread.id,
    parentId,
    content: body.content,
    authorId: req.user!.id,
    authorUsername: req.user!.username,
    deleted: false,
    createdAt: nowIso(),
  };
  await db.replies.update((rs) => { rs.push(reply); });
  await db.threads.update((ts) => {
    const t = ts.find((x) => x.id === thread.id);
    if (t) { t.replyCount += 1; t.updatedAt = nowIso(); }
  });
  res.status(201).json({ reply });
});

function canModerate(req: AuthedRequest, authorId: string): boolean {
  return req.user!.role === "admin" || req.user!.id === authorId;
}

discussionsRouter.patch("/threads/:id", requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const thread = db.threads.get().find((t) => t.id === req.params.id && !t.deleted);
  if (!thread) throw notFound("Thread not found");
  if (!canModerate(req, thread.authorId)) throw forbidden("You can only edit your own threads");
  const body = parseBody(postEditSchema.extend({ title: z.string().min(3).max(200).optional() }), req.body);
  await db.threads.update((ts) => {
    const t = ts.find((x) => x.id === thread.id)!;
    t.content = body.content;
    if (body.title) t.title = body.title.trim();
    t.updatedAt = nowIso();
  });
  res.json({ thread: db.threads.get().find((t) => t.id === thread.id) });
});

discussionsRouter.delete("/threads/:id", requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const thread = db.threads.get().find((t) => t.id === req.params.id && !t.deleted);
  if (!thread) throw notFound("Thread not found");
  if (!canModerate(req, thread.authorId)) throw forbidden("You can only delete your own threads");
  await db.threads.update((ts) => {
    const t = ts.find((x) => x.id === thread.id)!;
    t.deleted = true;
    t.updatedAt = nowIso();
  });
  res.json({ ok: true });
});

discussionsRouter.patch("/replies/:id", requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const reply = db.replies.get().find((r) => r.id === req.params.id && !r.deleted);
  if (!reply) throw notFound("Reply not found");
  if (!canModerate(req, reply.authorId)) throw forbidden("You can only edit your own replies");
  const body = parseBody(postEditSchema, req.body);
  await db.replies.update((rs) => {
    const r = rs.find((x) => x.id === reply.id)!;
    r.content = body.content;
    r.editedAt = nowIso();
  });
  res.json({ reply: db.replies.get().find((r) => r.id === reply.id) });
});

discussionsRouter.delete("/replies/:id", requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const reply = db.replies.get().find((r) => r.id === req.params.id && !r.deleted);
  if (!reply) throw notFound("Reply not found");
  if (!canModerate(req, reply.authorId)) throw forbidden("You can only delete your own replies");
  await db.replies.update((rs) => {
    const r = rs.find((x) => x.id === reply.id)!;
    r.deleted = true;
  });
  await db.threads.update((ts) => {
    const t = ts.find((x) => x.id === reply.threadId);
    if (t && t.replyCount > 0) t.replyCount -= 1;
  });
  res.json({ ok: true });
});

/* --------------------------------- reports --------------------------------- */

discussionsRouter.post("/reports", postLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const body = parseBody(reportCreateSchema, req.body);
  const db = getDb();
  const exists = body.targetType === "thread"
    ? db.threads.get().some((t) => t.id === body.targetId && !t.deleted)
    : db.replies.get().some((r) => r.id === body.targetId && !r.deleted);
  if (!exists) throw notFound("Reported content not found");
  // one open report per user per target
  const dup = db.reports.get().some((r) =>
    r.targetId === body.targetId && r.reporterId === req.user!.id && r.status === "open");
  if (dup) throw new HttpError(409, "duplicate_report", "You have already reported this content");
  const report = {
    id: newId("rep_"),
    targetType: body.targetType,
    targetId: body.targetId,
    reporterId: req.user!.id,
    reason: body.reason,
    status: "open" as const,
    createdAt: nowIso(),
  };
  await db.reports.update((rs) => { rs.push(report); });
  res.status(201).json({ report });
});
