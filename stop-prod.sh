#!/usr/bin/env bash
# Stop the production Devlog process.
set -euo pipefail
cd "$(dirname "$0")"
PIDFILE=.devlog-prod.pid
if [ ! -f "$PIDFILE" ]; then
  echo "No production PID file — nothing to stop."
  exit 0
fi
PID="$(cat "$PIDFILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID" 2>/dev/null || true
  for _ in $(seq 1 40); do
    kill -0 "$PID" 2>/dev/null || break
    sleep 0.25
  done
  kill -9 "$PID" 2>/dev/null || true
  echo "Stopped Devlog (pid $PID)"
fi
rm -f "$PIDFILE"
