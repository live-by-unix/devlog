#!/usr/bin/env bash
# Devlog — start the application (production mode if built, dev mode otherwise)
set -euo pipefail
cd "$(dirname "$0")"

log() { printf '\033[1;34m[devlog]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[devlog]\033[0m %s\n' "$*" >&2; }

# --- Node.js check ---
if ! command -v node >/dev/null 2>&1; then
  err "Node.js is not installed. Install Node.js 20+ (https://nodejs.org) and retry."
  exit 1
fi
NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
if [ "$NODE_MAJOR" -lt 20 ]; then
  err "Node.js >= 20 required (found $(node --version))."
  exit 1
fi
log "Node.js $(node --version) detected"

# --- Dependencies ---
if [ ! -d node_modules ]; then
  log "Installing dependencies…"
  npm install
fi

# --- Environment ---
if [ ! -f .env ]; then
  cp .env.example .env
  log "Created .env from .env.example"
fi

# --- Mode selection ---
if [ -f apps/web/dist/index.html ] && [ "${DEVLOG_DEV:-}" != "1" ]; then
  MODE=production
else
  MODE=development
fi

PIDFILE=.devlog.pid
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  err "Devlog appears to be running (pid $(cat "$PIDFILE")). Run ./stop.sh first."
  exit 1
fi

if [ "$MODE" = "production" ]; then
  log "Starting Devlog in PRODUCTION mode"
  export NODE_ENV=production
  npm run build --workspace @devlog/server --if-present || true
  PORT="${PORT:-3001}" HOST="${HOST:-0.0.0.0}" node apps/server/dist/index.js &
  echo $! > "$PIDFILE"
  sleep 1
  log "Devlog is running at http://localhost:${PORT:-3001}"
else
  log "Starting Devlog in DEVELOPMENT mode"
  # Build shared package types once, then run API + Vite dev server
  npm run build --workspace @devlog/shared
  (cd apps/server && npx tsx src/index.ts) &
  API_PID=$!
  (cd apps/web && npx vite --port 5173) &
  VITE_PID=$!
  echo "$API_PID $VITE_PID" > "$PIDFILE"
  trap 'kill $API_PID $VITE_PID 2>/dev/null; rm -f "$PIDFILE"' EXIT INT TERM
  log "API:      http://localhost:3001"
  log "Frontend: http://localhost:5173 (proxies /api to the backend)"
  wait
fi
