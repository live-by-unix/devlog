#!/usr/bin/env bash
# Renew Let's Encrypt certificates (normally handled automatically by certbot.timer).
set -euo pipefail
certbot renew --quiet
echo "Certificates renewed."
# Show timer status
systemctl list-timers certbot.timer --no-pager 2>/dev/null || true
