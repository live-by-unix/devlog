#!/usr/bin/env bash
# Show Devlog service status and recent logs.
set -euo pipefail
systemctl status devlog --no-pager -l || true
echo "---"
journalctl -u devlog -n 50 --no-pager || true
