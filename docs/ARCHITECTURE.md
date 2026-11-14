# Architecture

## Overview

Devlog is a monorepo with three packages:

- **apps/web** — React SPA (Vite, Tailwind, React Router). Talks to the API only.
- **apps/server** — Express API serving `/api/v1/*`, auth, uploads, SEO feeds, and (in production) the built SPA.
- **packages/shared** — Zod validation schemas and TypeScript types used by both.

## Request flow

```
Browser ──► Vite dev server (:5173) ──proxy /api──► Express (:3001)
                 or in production: Express serves apps/web/dist directly
```

## Storage

Everything persistent is JSON files under `data/` (see STORAGE.md). The `JsonFile` class provides atomic writes (tmp+rename), per-file write serialization, `.bak` recovery, and corruption detection. Collections are loaded into memory at boot and persisted on mutation.

## Auth

- Passwords: Argon2id via `@node-rs/argon2`.
- Sessions: opaque random tokens in HTTP-only cookies; only SHA-256 hashes stored in `data/sessions/sessions.json`.
- CSRF: double-submit cookie (`devlog_csrf`) signed with `SESSION_SECRET`; required on all non-GET API calls.
- Roles: `admin` (setup-created, dashboard access) and `user` (public registration).

## Security boundaries

- All authorization enforced server-side in route middleware (`requireAuth`, `requireAdmin`).
- Uploads validated by size, extension blocklist, and magic bytes; stored under randomized names in `data/uploads/`.
- Release downloads go through a permission-checked endpoint, never static file serving.
- Helmet CSP, rate limiting on auth/posting endpoints, Zod validation on every input.

## Real-time discussions

The frontend polls discussion endpoints (30s board / 15s thread). No external realtime service needed.
