#!/usr/bin/env bash
# Backup the Devlog data directory (wrapper around repo backup.sh).
set -euo pipefail
DATA_DIR="${DATA_DIR:-/var/lib/devlog}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/devlog}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/devlog-$STAMP.tar.gz"
mkdir -p "$BACKUP_DIR"
tar -czf "$OUT" -C "$DATA_DIR" .
gzip -t "$OUT"
echo "Backup: $OUT"
# Keep last 30 backups
ls -1t "$BACKUP_DIR"/devlog-*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
