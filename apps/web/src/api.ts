export interface ApiErrorShape {
  error: { code: string; message: string; details?: { path: string; message: string }[] | unknown };
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; formData?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const csrf = getCookie("devlog_csrf");
  if (csrf && options.method && options.method !== "GET") {
    headers["X-CSRF-Token"] = csrf;
  }
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const res = await fetch(`/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "same-origin",
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = (data as ApiErrorShape | null)?.error;
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return data as T;
}

/* ------------------------------ shared types ------------------------------ */

export interface User {
  id: string;
  username: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  createdAt: string;
  lastLoginAt?: string;
}

export interface Project {
  name: string;
  description: string;
  type: string;
  license: string;
  customLicense: string;
  repositoryUrl: string;
  websiteUrl: string;
  storeUrl: string;
  author: string;
  developerGithub: string;
  faviconPath: string;
  imagePath: string;
}

export interface ReleaseFile {
  id: string;
  displayName: string;
  size: number;
  mimeType: string;
  permission: "everyone" | "users";
  uploadedAt: string;
  storedName?: string;
  uploadedBy?: string;
}

export interface Release {
  id: string;
  name: string;
  version: string;
  description: string;
  githubUrl: string;
  newsletterId: string;
  status: "draft" | "published";
  files: ReleaseFile[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ReleaseSummary {
  id: string;
  name: string;
  version: string;
  descriptionExcerpt: string;
  githubUrl: string;
  newsletterId: string;
  status: "draft" | "published";
  fileCount: number;
  hasUserFiles: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface NewsletterSummary {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Newsletter {
  id: string;
  title: string;
  description: string;
  content: string;
  imagePath: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Thread {
  id: string;
  scope: "release" | "newsletter";
  targetId: string;
  title: string;
  content: string;
  authorId: string;
  authorUsername: string;
  locked: boolean;
  deleted: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reply {
  id: string;
  threadId: string;
  parentId: string;
  content: string;
  authorId: string;
  authorUsername: string;
  deleted: boolean;
  editedAt?: string;
  createdAt: string;
  children?: Reply[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function mediaUrl(path: string): string {
  return `/api/v1/media/${path}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
