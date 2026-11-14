#!/usr/bin/env bash
# Remove Devlog from the server. WARNING: does NOT delete data/ unless --purge-data.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/devlog}"
DATA_DIR="${DATA_DIR:-/var/lib/devlog}"

systemctl stop devlog 2>/dev/null || true
systemctl disable devlog 2>/dev/null || true
rm -f /etc/systemd/system/devlog.service
systemctl daemon-reload
rm -f /etc/nginx/sites-enabled/devlog /etc/nginx/sites-available/devlog
nginx -t && systemctl reload nginx || true
rm -rf "$APP_DIR"

if [ "${1:-}" = "--purge-data" ]; then
  rm -rf "$DATA_DIR" /var/backups/devlog /var/log/devlog
  echo "Data purged."
else
  echo "Data preserved at $DATA_DIR (use --purge-data to remove)."
fi
echo "Devlog uninstalled."
