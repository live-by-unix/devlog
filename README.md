# Devlog

**A self-hosted home for your software project.**

Devlog is a complete, self-hostable publishing platform for a single software product: a public website with releases, downloadable files, newsletters, and per-item discussion boards — plus an admin dashboard, native authentication, and file-based storage. No database server, no mandatory third-party services.

> ⚠️ **Warning:** all persistent data lives in `data/`. Deleting `data/` destroys users, releases, newsletters, discussions and uploads. Back up first — see `docs/BACKUPS.md`.

## Features

- Public website: hero, project info, latest releases & newsletters
- Releases with multiple downloadable files and per-file permissions (public / sign-in only)
- Newsletters with cover images and Markdown content
- Discussion boards per release and newsletter (nested replies, reporting, moderation, locking)
- Native auth: Argon2id passwords, secure sessions, CSRF protection, rate limiting
- Admin dashboard: project config, content management, user moderation, settings
- Markdown with GFM, live preview editor, syntax-safe rendering
- Light/dark themes, fully responsive
- REST API (`/api/v1`), RSS feeds, sitemap, robots.txt
- Docker, docker-compose, systemd, Nginx, Let's Encrypt, AWS EC2 deploy scripts

## Quick start (development)

```bash
git clone <repo> devlog && cd devlog
./start.sh        # installs deps, starts API (:3001) + Vite (:5173)
./stop.sh         # stops dev processes
```

Open http://localhost:5173 — the first-run setup wizard creates your admin account and project config.

## Production

```bash
./build.sh        # typecheck + tests + builds
./start-prod.sh   # serves the built app on :3001
./stop-prod.sh
```

Or with Docker:

```bash
cp .env.example .env   # set SESSION_SECRET
docker compose up -d
```

## Stack

React 19 · TypeScript · Vite · Tailwind · Express · Zod · Argon2id · JSON file storage · Vitest · Playwright

## Documentation

Full docs in [`docs/`](docs/README.md): installation, configuration, API, security, AWS EC2 deployment, domain setup, backups, and more.

## License

BSD-3-Clause — see [LICENSE](LICENSE).
