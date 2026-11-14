#!/usr/bin/env bash
# Development workflow: typecheck + watch-mode API and Vite dev server.
set -euo pipefail
cd "$(dirname "$0")"
exec ./start.sh
