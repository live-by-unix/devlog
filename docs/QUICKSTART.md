# Quickstart

## Local development

```bash
git clone <repo-url> devlog
cd devlog
./start.sh
```

- Frontend: http://localhost:5173
- API: http://localhost:3001 (`/health`, `/api/v1/status`)

Open the frontend — you'll see the **setup wizard**:

1. Create the administrator account (username + password).
2. Fill in project info (name, description, type, license, links).
3. You're redirected to the public homepage.

Sign in at `/login` any time; the admin dashboard is at `/admin`.

## Production build

```bash
./build.sh
./start-prod.sh     # http://localhost:3001 serves frontend + API
./stop-prod.sh
```

## Docker

```bash
cp .env.example .env   # set SESSION_SECRET
docker compose up -d
docker compose logs -f
```

Then open http://localhost:3001 and complete the setup wizard.

## Stop

```bash
./stop.sh          # dev mode
./stop-prod.sh     # production mode
docker compose down   # containers (data volume persists)
```

> Deleting `data/` resets the entire installation — see STORAGE.md.
