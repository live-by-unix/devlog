# Docker

## Run

```bash
cp .env.example .env   # set SESSION_SECRET
docker compose up -d
docker compose logs -f
docker compose down    # stops containers; data volume persists
```

Open http://localhost:3001 — first run shows the setup wizard.

## Configuration

Environment variables pass through `docker-compose.yml` (see ENVIRONMENT.md). `SESSION_SECRET` is required.

## Volumes

- `devlog-data` → `/app/data` — all persistent data. `docker compose down` does **not** delete it. `down -v` would — don't use it unless you intend a reset.

## Images

Multi-stage build: deps+build → slim runtime (node:22-alpine), non-root `devlog` user, production deps only, built-in `/health` check.

## Behind a domain

Point your domain at the host and use the domain scripts (they assume systemd/nginx; for Docker put a reverse proxy container or host nginx in front on port 80/443 proxying to `localhost:3001`).
