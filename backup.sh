#!/usr/bin/env bash
# Devlog backup — archive the entire data/ directory.
set -euo pipefail
cd "$(dirname "$0")"

DATA_DIR="${DATA_DIR:-./data}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/devlog-backup-$STAMP.tar.gz"

if [ ! -d "$DATA_DIR" ]; then
  echo "Error: data directory '$DATA_DIR' not found." >&2
  exit 1
fi
mkdir -p "$BACKUP_DIR"

# Consistent snapshot: stop writers is ideal, but JSON stores write atomically,
# so a tar of the directory is crash-consistent.
tar -czf "$OUT" -C "$DATA_DIR" .

# Validate the archive
gzip -t "$OUT"
if ! tar -tzf "$OUT" >/dev/null 2>&1; then
  echo "Error: backup archive failed validation." >&2
  rm -f "$OUT"
  exit 1
fi

echo "Backup written: $OUT ($(du -h "$OUT" | cut -f1))"
