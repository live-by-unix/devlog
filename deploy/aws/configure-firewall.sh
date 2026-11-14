#!/usr/bin/env bash
# Configure UFW firewall: SSH + HTTP + HTTPS only.
set -euo pipefail
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall configured: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
ufw status
