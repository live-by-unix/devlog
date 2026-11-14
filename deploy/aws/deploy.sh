#!/usr/bin/env bash
# Deploy Devlog application files to the server (run ON the server, or via SSH).
# Usage: ./deploy/aws/deploy.sh [/path/to/repo-or-archive]
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/devlog}"
DATA_DIR="${DATA_DIR:-/var/lib/devlog}"
SRC="${1:-.}"

echo "==> Deploying Devlog to $APP_DIR"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root or with sudo." >&2
  exit 1
fi

mkdir -p "$APP_DIR"

# Copy application source (exclude data/, node_modules, .git)
if [ -d "$SRC" ]; then
  rsync -a --delete \
    --exclude node_modules --exclude .git --exclude data --exclude backups \
    --exclude 'apps/web/dist' --exclude 'apps/server/dist' \
    "$SRC/" "$APP_DIR/" 2>/dev/null || \
  (cd "$SRC" && tar cf - --exclude=node_modules --exclude=.git --exclude=data --exclude=backups .) | tar xf - -C "$APP_DIR"
fi

cd "$APP_DIR"
chown -R devlog:devlog "$APP_DIR" 2>/dev/null || true

echo "==> Installing production dependencies"
npm ci --omit=dev --workspace @devlog/server --workspace @devlog/shared --include-workspace-root=false || npm install --omit=dev

echo "==> Building"
npm run build -w @devlog/shared
npm run build -w @devlog/server
npm run build -w @devlog/web

echo "==> Ensuring data dir ownership"
chown -R devlog:devlog "$DATA_DIR"

echo "==> Done. Start/restart with: systemctl restart devlog"
