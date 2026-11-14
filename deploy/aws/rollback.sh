#!/usr/bin/env bash
# Roll back to the previous application version (keeps current data/).
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/devlog}"

echo "==> Rolling back Devlog"

if [ ! -d "$APP_DIR.prev" ]; then
  echo "No previous version found at $APP_DIR.prev" >&2
  exit 1
fi

systemctl stop devlog || true
rm -rf "$APP_DIR.failed-$(date -u +%Y%m%dT%H%M%SZ)"
mv "$APP_DIR" "$APP_DIR.failed-$(date -u +%Y%m%dT%H%M%SZ)"
mv "$APP_DIR.prev" "$APP_DIR"
systemctl start devlog
sleep 2
curl -fsS http://127.0.0.1:3001/health && echo " — rollback OK" || echo "rollback health check failed"
