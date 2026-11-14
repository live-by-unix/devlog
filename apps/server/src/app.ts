import "express-async-errors";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";
import { Logger } from "./logger.js";
import { initDatabase, runMigrations, isInitialized, getDb } from "./storage/db.js";
import { attachUser } from "./auth/index.js";
import { csrfProtection, issueCsrf, errorHandler } from "./middleware.js";
import { metaRouter } from "./routes/meta.js";
import { authRouter } from "./routes/auth.js";
import { contentRouter } from "./routes/content.js";
import { discussionsRouter } from "./routes/discussions.js";
import { adminRouter } from "./routes/admin.js";
import { seoRouter } from "./routes/seo.js";
import { serveMedia } from "./uploads.js";

export interface AppContext {
  logger: Logger;
}

export function createApp(): express.Express {
  const logger = new Logger(config.logLevel as import("./logger.js").LogLevel, path.join(config.dataDir, "logs", "app.log"));
  initDatabase(logger);

  const app = express();
  app.set("trust proxy", config.trustProxy === "true" ? true : parseInt(config.trustProxy || "1", 10) || 1);
  app.set("cookieSecure", config.cookieSecure);
  app.locals.logger = logger;

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false, limit: "2mb" }));
  app.use(cookieParser());
  app.use(cors({
    origin: config.allowedOrigins.length ? config.allowedOrigins : false,
    credentials: true,
  }));

  app.use((req, res, next) => {
    issueCsrf(req, res);
    next();
  });
  app.use(attachUser);
  app.use(csrfProtection);

  // Maintenance mode: block public API mutations (admin still allowed)
  app.use("/api/v1", (req, res, next) => {
    if (getDb().settings.get().maintenanceMode && req.method !== "GET" && req.method !== "HEAD") {
      const user = (req as { user?: { role?: string } }).user;
      if (user?.role !== "admin") {
        res.status(503).json({ error: { code: "maintenance", message: "The site is under maintenance" } });
        return;
      }
    }
    next();
  });

  app.use("/api/v1", metaRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", contentRouter);
  app.use("/api/v1/discussions", discussionsRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/", seoRouter);
  app.get("/api/v1/media/*", serveMedia);

  // Top-level health endpoints for load balancers / uptime checks
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", (_req, res) => {
    try {
      getDb().installation.get();
      res.json({ status: "ready", initialized: isInitialized() });
    } catch {
      res.status(503).json({ status: "not_ready" });
    }
  });

  // Serve built frontend in production
  if (config.isProd && fs.existsSync(config.webDistDir)) {
    app.use(express.static(config.webDistDir, { maxAge: "1h", index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path === "/health" || req.path === "/ready") return next();
      res.sendFile(path.join(config.webDistDir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}

export async function boot(): Promise<{ app: express.Express; logger: Logger }> {
  const app = createApp();
  await runMigrations(app.locals.logger as Logger);
  return { app, logger: app.locals.logger as Logger };
}
