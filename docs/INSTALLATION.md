# Installation

## Requirements

- Node.js >= 20 (22 LTS recommended)
- npm >= 10
- ~200 MB disk for app + data (more for uploads)

## Option A — from source (development)

```bash
git clone <repo-url> devlog
cd devlog
./start.sh
```

`start.sh` checks Node, installs dependencies if needed, creates `.env` from `.env.example`, and starts both the API (port 3001) and the Vite dev server (port 5173).

## Option B — production build on a server

```bash
git clone <repo-url> devlog && cd devlog
npm install
cp .env.example .env
# edit .env: set SESSION_SECRET (node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
./build.sh
./start-prod.sh
```

The production server serves the built frontend and API on `PORT` (default 3001). Put Nginx in front for HTTPS — see HTTPS.md.

## Option C — Docker

```bash
git clone <repo-url> devlog && cd devlog
cp .env.example .env   # set SESSION_SECRET
docker compose up -d
```

See DOCKER.md.

## Option D — AWS EC2

See AWS-EC2.md and `deploy/aws/`.

## First run

On first launch Devlog creates `data/` and shows the setup wizard. Complete it to create the admin account and configure the project. Deleting `data/` resets everything.
