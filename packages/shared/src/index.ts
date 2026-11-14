import { z } from "zod";

/* ---------------------------------- utils --------------------------------- */

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, numbers, dots, dashes and underscores");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200, "Password must be at most 200 characters")
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Password must contain at least one letter and one number");

export const urlSchema = z
  .string()
  .max(2000)
  .refine((u) => {
    try {
      const url = new URL(u);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Must be a valid http(s) URL")
  .optional()
  .or(z.literal(""));

export const optionalUrl = urlSchema;

export const markdownSchema = z.string().max(200_000, "Content is too large");
export const shortTextSchema = z.string().max(500);
export const longTextSchema = z.string().max(5000);
export const idSchema = z.string().min(1).max(64);

export const LICENSES = [
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "GPL-2.0",
  "LGPL-3.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "MPL-2.0",
  "AGPL-3.0",
  "Other",
] as const;

export const PROJECT_TYPES = [
  "Application",
  "Library",
  "Framework",
  "Tool",
  "Game",
  "API",
  "CLI",
  "Extension",
  "Other",
] as const;

/* ---------------------------------- auth ---------------------------------- */

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const setupSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* --------------------------------- project -------------------------------- */

export const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: longTextSchema,
  type: z.string().min(1).max(60),
  license: z.enum(LICENSES),
  customLicense: z.string().max(120).optional().or(z.literal("")),
  repositoryUrl: optionalUrl,
  websiteUrl: optionalUrl,
  storeUrl: optionalUrl,
  author: z.string().max(200).optional().or(z.literal("")),
  developerGithub: optionalUrl,
  faviconPath: z.string().max(500).optional().or(z.literal("")),
  imagePath: z.string().max(500).optional().or(z.literal("")),
});

/* --------------------------------- release -------------------------------- */

export const releaseInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  version: z.string().min(1, "Version is required").max(60),
  description: markdownSchema,
  githubUrl: optionalUrl,
  newsletterId: z.string().max(64).optional().or(z.literal("")),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const releaseFileInputSchema = z.object({
  displayName: z.string().min(1).max(300),
  storedName: z.string().min(1).max(300),
  size: z.number().int().nonnegative(),
  mimeType: z.string().max(200),
  permission: z.enum(["everyone", "users"]).default("everyone"),
});

/* ------------------------------- newsletters ------------------------------ */

export const newsletterInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: shortTextSchema,
  content: markdownSchema,
  imagePath: z.string().max(500).optional().or(z.literal("")),
  status: z.enum(["draft", "published"]).default("draft"),
});

/* ------------------------------- discussions ------------------------------ */

export const discussionScopeSchema = z.enum(["release", "newsletter"]);

export const threadCreateSchema = z.object({
  scope: discussionScopeSchema,
  targetId: idSchema,
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  content: markdownSchema.refine((c) => c.trim().length > 0, "Content is required"),
});

export const replyCreateSchema = z.object({
  content: markdownSchema.refine((c) => c.trim().length > 0, "Content is required"),
  parentId: z.string().max(64).optional().or(z.literal("")),
});

export const postEditSchema = z.object({
  content: markdownSchema.refine((c) => c.trim().length > 0, "Content is required"),
});

export const reportCreateSchema = z.object({
  targetType: z.enum(["thread", "reply"]),
  targetId: idSchema,
  reason: z.string().min(3, "Please provide a reason").max(1000),
});

/* ---------------------------------- admin --------------------------------- */

export const settingsSchema = z.object({
  maxUploadMb: z.number().int().min(1).max(2048),
  maxImageMb: z.number().int().min(1).max(100),
  sessionTtlDays: z.number().int().min(1).max(365),
  sessionIdleHours: z.number().int().min(1).max(720),
  maintenanceMode: z.boolean().default(false),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/* ----------------------------------- API ----------------------------------- */

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const APP_VERSION = "1.0.0";
export const INSTALLATION_VERSION = 1;
