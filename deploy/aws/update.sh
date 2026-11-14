#!/usr/bin/env bash
# Update Devlog to a new version while preserving data/.
# Keeps the previous build for rollback.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/devlog}"
DATA_DIR="${DATA_DIR:-/var/lib/devlog}"
BACKUP_DIR="/var/backups/devlog"

echo "==> Updating Devlog"

# 1. Backup current data before any migration risk
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
if [ -d "$DATA_DIR" ]; then
  tar -czf "$BACKUP_DIR/data-pre-update-$STAMP.tar.gz" -C "$DATA_DIR" .
  echo "==> Data backed up to $BACKUP_DIR/data-pre-update-$STAMP.tar.gz"
fi

# 2. Snapshot current app for rollback
if [ -d "$APP_DIR" ]; then
  rm -rf "$APP_DIR.prev"
  cp -a "$APP_DIR" "$APP_DIR.prev" 2>/dev/null || true
fi

# 3. Receive new code (from git pull in $APP_DIR, or rsync from $1)
if [ -n "${1:-}" ]; then
  SRC="$1"
  rsync -a --delete --exclude node_modules --exclude .git --exclude data --exclude backups "$SRC/" "$APP_DIR/"
else
  cd "$APP_DIR" && git pull --ff-only || { echo "git pull failed"; exit 1; }
fi

cd "$APP_DIR"
echo "==> Installing dependencies"
npm ci --omit=dev --workspace @devlog/server --workspace @devlog/shared --include-workspace-root=false || npm install --omit=dev

echo "==> Building"
npm run build -w @devlog/shared && npm run build -w @devlog/server && npm run build -w @devlog/web

echo "==> Restarting service"
systemctl restart devlog

# 4. Health check with rollback
sleep 3
if curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; then
  echo "==> Update successful — health check passed"
else
  echo "!! Health check failed — rolling back" >&2
  if [ -d "$APP_DIR.prev" ]; then
    rm -rf "$APP_DIR.new"; mv "$APP_DIR" "$APP_DIR.new"; mv "$APP_DIR.prev" "$APP_DIR"
    systemctl restart devlog
    echo "==> Rolled back to previous version"
  fi
  exit 1
fi
