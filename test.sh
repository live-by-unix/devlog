#!/usr/bin/env bash
# Run the complete test suite (unit + integration; e2e requires Playwright browsers).
set -euo pipefail
cd "$(dirname "$0")"
npm test --workspaces --if-present
