import { Router } from "express";
import { paginationSchema } from "@devlog/shared";
import { getDb } from "../storage/db.js";
import { parseBody, notFound } from "../middleware.js";
import type { Release, Newsletter } from "../storage/db.js";

export const contentRouter = Router();

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((p - 1) * pageSize, p * pageSize), total, page: p, pageSize, totalPages };
}

/** Public project info (never includes private fields). */
contentRouter.get("/project", (_req, res) => {
  res.json({ project: getDb().project.get() });
});

/** Homepage aggregate: project + latest newsletters + latest releases. */
contentRouter.get("/home", (_req, res) => {
  const db = getDb();
  const publishedNews = db.newsletters.get()
    .filter((n) => n.status === "published")
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
  const publishedRel = db.releases.get()
    .filter((r) => r.status === "published")
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));

  const newsletters = [...publishedNews];
  // pick: latest, second, random (not duplicating when possible)
  const latest = newsletters.slice(0, 2);
  const rest = newsletters.slice(2);
  let randomPick: Newsletter | undefined;
  if (rest.length > 0) {
    randomPick = rest[Math.floor(Math.random() * rest.length)];
  } else if (newsletters.length > 2) {
    randomPick = newsletters[Math.floor(Math.random() * newsletters.length)];
  }
  const cards = [...latest];
  if (randomPick && !cards.some((n) => n.id === randomPick!.id)) cards.push(randomPick);

  res.json({
    project: db.project.get(),
    newsletters: cards.slice(0, 3).map(publicNewsletter),
    releases: publishedRel.slice(0, 4).map(publicRelease),
    releaseCount: publishedRel.length,
    newsletterCount: publishedNews.length,
  });
});

/* --------------------------------- releases -------------------------------- */

function publicRelease(r: Release) {
  return {
    id: r.id, name: r.name, version: r.version,
    descriptionExcerpt: r.description.slice(0, 300),
    githubUrl: r.githubUrl, newsletterId: r.newsletterId,
    status: r.status, fileCount: r.files.length,
    hasUserFiles: r.files.some((f) => f.permission === "users"),
    createdAt: r.createdAt, updatedAt: r.updatedAt, publishedAt: r.publishedAt,
  };
}

contentRouter.get("/releases", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const items = getDb().releases.get()
    .filter((r) => r.status === "published")
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
  res.json(paginate(items.map(publicRelease), q.page, q.pageSize));
});

contentRouter.get("/releases/:id", (req, res) => {
  const r = getDb().releases.get().find((x) => x.id === req.params.id);
  if (!r || r.status !== "published") throw notFound("Release not found");
  res.json({
    release: {
      ...r,
      files: r.files.map((f) => ({
        id: f.id, displayName: f.displayName, size: f.size, mimeType: f.mimeType,
        permission: f.permission, uploadedAt: f.uploadedAt,
      })),
    },
  });
});

/* ------------------------------- newsletters ------------------------------- */

function publicNewsletter(n: Newsletter) {
  return {
    id: n.id, title: n.title, description: n.description,
    imagePath: n.imagePath, status: n.status,
    createdAt: n.createdAt, updatedAt: n.updatedAt, publishedAt: n.publishedAt,
  };
}

contentRouter.get("/newsletters", (req, res) => {
  const q = parseBody(paginationSchema, req.query);
  const items = getDb().newsletters.get()
    .filter((n) => n.status === "published")
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
  res.json(paginate(items.map(publicNewsletter), q.page, q.pageSize));
});

contentRouter.get("/newsletters/:id", (req, res) => {
  const n = getDb().newsletters.get().find((x) => x.id === req.params.id);
  if (!n || n.status !== "published") throw notFound("Newsletter not found");
  res.json({ newsletter: n });
});
