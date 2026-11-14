#!/usr/bin/env bash
# Follow Devlog logs (application + nginx).
set -euo pipefail
N="${1:-100}"
echo "=== devlog service ==="
journalctl -u devlog -n "$N" --no-pager -f &
JPID=$!
echo "=== nginx error log ==="
tail -n "$N" -f /var/log/nginx/error.log &
TPID=$!
trap 'kill $JPID $TPID 2>/dev/null' EXIT
wait
