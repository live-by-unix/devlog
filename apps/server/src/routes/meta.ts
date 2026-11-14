import { Router } from "express";
import { getDb, isInitialized } from "../storage/db.js";
import { projectSchema, setupSchema } from "@devlog/shared";
import { registerUser, createSession } from "../auth/index.js";
import { parseBody, badRequest, conflict } from "../middleware.js";
import { nowIso, newId } from "../storage/ids.js";
import { APP_VERSION } from "@devlog/shared";
import type { AuthedRequest } from "../auth/index.js";

export const metaRouter = Router();

metaRouter.get("/status", (_req, res) => {
  const db = getDb();
  const project = db.project.get();
  res.json({
    initialized: isInitialized(),
    needsSetup: !isInitialized() || getDb().installation.get().wizardComplete === false,
    version: APP_VERSION,
    maintenance: db.settings.get().maintenanceMode,
    project: {
      name: project.name,
      faviconPath: project.faviconPath,
      imagePath: project.imagePath,
    },
  });
});

metaRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

metaRouter.get("/ready", (_req, res) => {
  try {
    getDb().installation.get();
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

/** First-time setup: create admin account, then configure project. */
metaRouter.post("/setup", async (req: AuthedRequest, res) => {
  const db = getDb();
  if (isInitialized()) throw conflict("Installation is already initialized");
  const body = parseBody(setupSchema, req.body);

  const admin = await registerUser(body.username, body.password, "admin");

  // If a project payload is included, save it too.
  if (req.body?.project && typeof req.body.project === "object") {
    const project = parseBody(projectSchema, req.body.project);
    await db.project.update((p) => Object.assign(p, project));
  }

  await db.installation.update((i) => ({ ...i, initialized: true, installedAt: nowIso(), version: 1 }));
  await createSession(admin.id, req, res);
  res.status(201).json({ ok: true, user: { id: admin.id, username: admin.username, role: admin.role } });
});

/** Complete project config during/after setup (admin). */
metaRouter.post("/setup/project", async (req: AuthedRequest, res) => {
  const db = getDb();
  if (!isInitialized()) throw badRequest("Finish account setup first");
  const project = parseBody(projectSchema, req.body);
  await db.project.update((p) => Object.assign(p, project));
  await db.installation.update((i) => ({ ...i, wizardComplete: true }));
  res.json({ project: db.project.get() });
});
