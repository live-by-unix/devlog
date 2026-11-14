#!/usr/bin/env bash
# Boot a production build of Devlog for Playwright e2e tests.
set -euo pipefail
cd "$(dirname "$0")/.."

DATA_DIR="$(mktemp -d /tmp/devlog-e2e-XXXXXX)"
export DATA_DIR
export NODE_ENV=production
export PORT=4173
export HOST=127.0.0.1
export SESSION_SECRET="e2e-test-secret-0123456789abcdef0123456789"
export COOKIE_SECURE=false
export TRUST_PROXY=false
export WEB_DIST_DIR="$PWD/apps/web/dist"

# Build if needed
[ -f apps/web/dist/index.html ] || npm run build -w @devlog/web
[ -f apps/server/dist/index.js ] || npm run build -w @devlog/server
[ -d packages/shared/dist ] || npm run build -w @devlog/shared

exec node apps/server/dist/index.js
