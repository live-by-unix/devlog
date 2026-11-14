#!/usr/bin/env bash
# Devlog restore — restore a backup archive into data/.
set -euo pipefail
cd "$(dirname "$0")"

DATA_DIR="${DATA_DIR:-./data}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

usage() {
  echo "Usage: $0 <backup-file.tar.gz> [--force]"
  echo "Available backups:"
  ls -1t "$BACKUP_DIR"/devlog-backup-*.tar.gz 2>/dev/null | head -20 || true
  exit "${1:-0}"
}

ARCHIVE="${1:-}"
FORCE="${2:-}"
[ -z "$ARCHIVE" ] && usage 1
[ -f "$ARCHIVE" ] || ARCHIVE="$BACKUP_DIR/$(basename "$ARCHIVE")"
[ -f "$ARCHIVE" ] || { echo "Backup not found: $1" >&2; usage 1; }

gzip -t "$ARCHIVE" || { echo "Archive is corrupt." >&2; exit 1; }

if [ -d "$DATA_DIR" ] && [ "$(ls -A "$DATA_DIR" 2>/dev/null)" ] && [ "$FORCE" != "--force" ]; then
  echo "WARNING: $DATA_DIR exists and is not empty." >&2
  echo "Restoring will overwrite it. Re-run with --force to confirm." >&2
  exit 1
fi

# Preserve current data as a safety backup before overwriting
if [ -d "$DATA_DIR" ] && [ "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  SAFETY="$BACKUP_DIR/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
  mkdir -p "$BACKUP_DIR"
  tar -czf "$SAFETY" -C "$DATA_DIR" .
  echo "Current data backed up to: $SAFETY"
fi

rm -rf "$DATA_DIR"
mkdir -p "$DATA_DIR"
tar -xzf "$ARCHIVE" -C "$DATA_DIR"
echo "Restored $ARCHIVE into $DATA_DIR"
echo "Restart Devlog to use the restored data."
