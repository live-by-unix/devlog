#!/usr/bin/env bash
# Restore Devlog data from a backup archive.
set -euo pipefail
DATA_DIR="${DATA_DIR:-/var/lib/devlog}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/devlog}"

ARCHIVE="${1:-}"
[ -z "$ARCHIVE" ] && { echo "Usage: $0 <backup.tar.gz> [--force]"; ls -1t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head; exit 1; }
[ -f "$ARCHIVE" ] || ARCHIVE="$BACKUP_DIR/$(basename "$ARCHIVE")"
[ -f "$ARCHIVE" ] || { echo "Not found: $1"; exit 1; }
gzip -t "$ARCHIVE" || { echo "Corrupt archive"; exit 1; }

if [ "${2:-}" != "--force" ] && [ -d "$DATA_DIR" ] && [ "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  echo "Data dir is not empty. Re-run with --force to overwrite." >&2
  exit 1
fi

systemctl stop devlog || true
SAFETY="$BACKUP_DIR/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
[ -d "$DATA_DIR" ] && tar -czf "$SAFETY" -C "$DATA_DIR" . 2>/dev/null || true
rm -rf "$DATA_DIR"; mkdir -p "$DATA_DIR"
tar -xzf "$ARCHIVE" -C "$DATA_DIR"
chown -R devlog:devlog "$DATA_DIR" 2>/dev/null || true
systemctl start devlog
echo "Restored. Service restarted."
