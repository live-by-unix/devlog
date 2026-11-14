#!/usr/bin/env bash
# Start Devlog in production mode using the built artifacts.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f apps/web/dist/index.html ] || [ ! -f apps/server/dist/index.js ]; then
  echo "Production build not found. Run ./build.sh first." >&2
  exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — set SESSION_SECRET to a long random value!"
fi

export NODE_ENV=production
PORT="${PORT:-3001}"
HOST="${HOST:-0.0.0.0}"
PIDFILE=.devlog-prod.pid
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Devlog already running (pid $(cat "$PIDFILE")). Run ./stop-prod.sh first." >&2
  exit 1
fi

node apps/server/dist/index.js > logs/prod.log 2>&1 &
echo $! > "$PIDFILE"
sleep 1
if ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Failed to start — see logs/prod.log" >&2
  rm -f "$PIDFILE"
  exit 1
fi
echo "Devlog running at http://${HOST}:${PORT} (pid $(cat "$PIDFILE"))"
echo "Logs: logs/prod.log"
