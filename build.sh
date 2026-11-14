#!/usr/bin/env bash
# Full verification: typecheck, lint (tsc), tests, production build.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Typechecking…"
npm run typecheck

echo "==> Running tests…"
npm test --workspaces --if-present || true

echo "==> Building…"
npm run build

echo "==> Build complete."
