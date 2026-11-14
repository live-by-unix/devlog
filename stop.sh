#!/usr/bin/env bash
# Stop the running Devlog processes started by start.sh / dev.sh
set -euo pipefail
cd "$(dirname "$0")"

PIDFILE=.devlog.pid
if [ ! -f "$PIDFILE" ]; then
  echo "No PID file found — nothing to stop (or Devlog was not started via start.sh)."
  exit 0
fi

read -r API_PID VITE_PID < "$PIDFILE" || API_PID="$(cat "$PIDFILE")"

stop_pid() {
  local pid="$1" label="$2"
  [ -z "$pid" ] && return 0
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.25
    done
    kill -9 "$pid" 2>/dev/null || true
    echo "Stopped $label (pid $pid)"
  fi
}

stop_pid "${API_PID:-}" "backend"
stop_pid "${VITE_PID:-}" "frontend"
rm -f "$PIDFILE"
echo "Devlog stopped."
