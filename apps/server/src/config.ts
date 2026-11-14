import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function env(key: string, fallback?: string): string | undefined {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

export const config = {
  env: env("NODE_ENV", "development") ?? "development",
  isProd: (env("NODE_ENV", "development") ?? "development") === "production",
  port: parseInt(env("PORT", "3001")!, 10),
  host: env("HOST", "127.0.0.1")!,
  dataDir: path.resolve(env("DATA_DIR", path.join(__dirname, "..", "..", "..", "data"))!),
  sessionSecret: env("SESSION_SECRET") ?? "dev-only-insecure-secret-change-me",
  cookieSecure: env("COOKIE_SECURE", "false") === "true",
  trustProxy: env("TRUST_PROXY", "") ?? "",
  allowedOrigins: (env("ALLOWED_ORIGINS", "") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  maxUploadMb: parseInt(env("MAX_UPLOAD_MB", "100")!, 10),
  maxImageMb: parseInt(env("MAX_IMAGE_MB", "5")!, 10),
  sessionTtlDays: parseInt(env("SESSION_TTL_DAYS", "30")!, 10),
  sessionIdleHours: parseInt(env("SESSION_IDLE_HOURS", "72")!, 10),
  logLevel: env("LOG_LEVEL", "info") ?? "info",
  webDistDir: path.resolve(env("WEB_DIST_DIR", path.join(__dirname, "..", "..", "web", "dist"))!),
};

if (config.isProd && (config.sessionSecret.includes("change-me") || config.sessionSecret.length < 32)) {
  // eslint-disable-next-line no-console
  console.error("FATAL: SESSION_SECRET must be set to a long random value in production.");
  process.exit(1);
}
