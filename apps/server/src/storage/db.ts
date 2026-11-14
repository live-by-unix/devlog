import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { JsonFile } from "./jsonFile.js";
import { INSTALLATION_VERSION } from "@devlog/shared";
import { config } from "../config.js";
import { Logger } from "../logger.js";

/* --------------------------------- entities -------------------------------- */

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  usernameLower: z.string(),
  passwordHash: z.string(),
  role: z.enum(["admin", "user"]),
  status: z.enum(["active", "suspended"]),
  createdAt: z.string(),
  lastLoginAt: z.string().optional(),
});
export type User = z.infer<typeof userSchema>;
export type PublicUser = Omit<User, "passwordHash">;

export const projectSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  type: z.string().default(""),
  license: z.string().default(""),
  customLicense: z.string().default(""),
  repositoryUrl: z.string().default(""),
  websiteUrl: z.string().default(""),
  storeUrl: z.string().default(""),
  author: z.string().default(""),
  developerGithub: z.string().default(""),
  faviconPath: z.string().default(""),
  imagePath: z.string().default(""),
});
export type Project = z.infer<typeof projectSchema>;

export const settingsSchemaDb = z.object({
  maxUploadMb: z.number().default(100),
  maxImageMb: z.number().default(5),
  sessionTtlDays: z.number().default(30),
  sessionIdleHours: z.number().default(72),
  maintenanceMode: z.boolean().default(false),
});
export type AppSettings = z.infer<typeof settingsSchemaDb>;

export const securitySchemaDb = z.object({
  passwordMinLength: z.number().default(10),
  requireNumberInPassword: z.boolean().default(true),
});
export type SecuritySettings = z.infer<typeof securitySchemaDb>;

export const releaseFileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  storedName: z.string(),
  size: z.number(),
  mimeType: z.string(),
  permission: z.enum(["everyone", "users"]),
  uploadedAt: z.string(),
  uploadedBy: z.string(),
});
export type ReleaseFile = z.infer<typeof releaseFileSchema>;

export const releaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  githubUrl: z.string().default(""),
  newsletterId: z.string().default(""),
  status: z.enum(["draft", "published"]),
  files: z.array(releaseFileSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
});
export type Release = z.infer<typeof releaseSchema>;

export const newsletterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  content: z.string(),
  imagePath: z.string().default(""),
  status: z.enum(["draft", "published"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
});
export type Newsletter = z.infer<typeof newsletterSchema>;

export const threadSchema = z.object({
  id: z.string(),
  scope: z.enum(["release", "newsletter"]),
  targetId: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  authorUsername: z.string(),
  locked: z.boolean().default(false),
  deleted: z.boolean().default(false),
  replyCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Thread = z.infer<typeof threadSchema>;

export const replySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  parentId: z.string().default(""),
  content: z.string(),
  authorId: z.string(),
  authorUsername: z.string(),
  deleted: z.boolean().default(false),
  editedAt: z.string().optional(),
  createdAt: z.string(),
});
export type Reply = z.infer<typeof replySchema>;

export const reportSchema = z.object({
  id: z.string(),
  targetType: z.enum(["thread", "reply"]),
  targetId: z.string(),
  reporterId: z.string(),
  reason: z.string(),
  status: z.enum(["open", "resolved", "dismissed"]).default("open"),
  createdAt: z.string(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().optional(),
});
export type Report = z.infer<typeof reportSchema>;

export const sessionSchema = z.object({
  id: z.string(), // sha256 hash of cookie token
  userId: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  lastSeenAt: z.string(),
  userAgent: z.string().default(""),
  ip: z.string().default(""),
});
export type Session = z.infer<typeof sessionSchema>;

export const installationSchema = z.object({
  initialized: z.boolean().default(false),
  wizardComplete: z.boolean().default(false),
  installedAt: z.string().optional(),
  version: z.number().default(INSTALLATION_VERSION),
});
export type Installation = z.infer<typeof installationSchema>;

/* ---------------------------------- store ---------------------------------- */

function arr<S extends z.ZodTypeAny>(schema: S, file: string): JsonFile<z.output<S>[]> {
  return new JsonFile<z.output<S>[]>(file, [], (raw) => {
    if (!Array.isArray(raw)) throw new Error(`Expected array in ${file}`);
    return raw.map((item) => schema.parse(item));
  });
}

function doc<S extends z.ZodTypeAny>(schema: S, file: string, fallback: z.output<S>): JsonFile<z.output<S>> {
  return new JsonFile<z.output<S>>(file, fallback, (raw) => schema.parse(raw ?? {}));
}

export interface Database {
  dir: string;
  users: JsonFile<User[]>;
  sessions: JsonFile<Session[]>;
  releases: JsonFile<Release[]>;
  newsletters: JsonFile<Newsletter[]>;
  threads: JsonFile<Thread[]>;
  replies: JsonFile<Reply[]>;
  reports: JsonFile<Report[]>;
  project: JsonFile<Project>;
  settings: JsonFile<AppSettings>;
  security: JsonFile<SecuritySettings>;
  installation: JsonFile<Installation>;
}

export const DATA_DIRS = [
  "config", "users", "sessions", "releases", "newsletters",
  "discussions", "uploads/favicon", "uploads/project",
  "uploads/releases", "uploads/newsletters", "private", "logs", "metadata",
] as const;

let db: Database | null = null;

export function initDatabase(logger?: Logger): Database {
  if (db) return db;
  const dir = config.dataDir;
  for (const d of DATA_DIRS) {
    fs.mkdirSync(path.join(dir, d), { recursive: true, mode: 0o700 });
  }
  const p = (...segs: string[]) => path.join(dir, ...segs);

  const result: Database = {
    dir,
    users: arr(userSchema, p("users", "users.json")),
    sessions: arr(sessionSchema, p("sessions", "sessions.json")),
    releases: arr(releaseSchema, p("releases", "releases.json")),
    newsletters: arr(newsletterSchema, p("newsletters", "newsletters.json")),
    threads: arr(threadSchema, p("discussions", "threads.json")),
    replies: arr(replySchema, p("discussions", "replies.json")),
    reports: arr(reportSchema, p("discussions", "reports.json")),
    project: doc(projectSchema, p("config", "project.json"), projectSchema.parse({})),
    settings: doc(settingsSchemaDb, p("config", "settings.json"), settingsSchemaDb.parse({})),
    security: doc(securitySchemaDb, p("config", "security.json"), securitySchemaDb.parse({})),
    installation: doc(installationSchema, p("metadata", "installation.json"), installationSchema.parse({})),
  };
  db = result;
  logger?.info("database initialized", { dir });
  return result;
}

export function getDb(): Database {
  if (!db) throw new Error("Database not initialized — call initDatabase() first");
  return db;
}

export function isInitialized(): boolean {
  return db?.installation.get().initialized === true;
}

/** Apply pending migrations. Bump INSTALLATION_VERSION when schema changes. */
export async function runMigrations(logger?: Logger): Promise<void> {
  const inst = getDb().installation;
  const current = inst.get().version;
  if (current < 1) {
    // v1 is the baseline schema; nothing to transform.
    await inst.update((d) => ({ ...d, version: Math.max(d.version, 1) }));
  }
  logger?.info("migrations complete", { from: current });
}
