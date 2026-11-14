#!/usr/bin/env bash
# Obtain a Let's Encrypt certificate via Certbot and enable HTTPS.
set -euo pipefail
DOMAIN="${1:?Usage: $0 <domain> [www.domain]}"
EXTRA="${2:-}"

echo "==> Verifying DNS resolves to this server"
SERVER_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
echo "    Server public IP: $SERVER_IP"
RESOLVED="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || dig +short A "$DOMAIN" | head -1)"
if [ -n "$RESOLVED" ] && [ "$RESOLVED" != "$SERVER_IP" ]; then
  echo "WARNING: $DOMAIN resolves to $RESOLVED, not $SERVER_IP." >&2
  echo "Fix DNS first (see deploy/domain/verify-dns.sh). Continuing anyway…"
fi

echo "==> Requesting certificate"
certbot --nginx -d "$DOMAIN" ${EXTRA:+-d "$EXTRA"} --non-interactive --agree-tos --redirect -m "${CERTBOT_EMAIL:-admin@$DOMAIN}" || {
  echo "Certbot failed. Ensure DNS points here and port 80 is reachable." >&2
  exit 1
}

# Ensure COOKIE_SECURE=true in app env
ENV_FILE="${APP_DIR:-/opt/devlog}/.env"
if [ -f "$ENV_FILE" ] && ! grep -q "^COOKIE_SECURE=true" "$ENV_FILE"; then
  echo "COOKIE_SECURE=true" >> "$ENV_FILE"
  systemctl restart devlog 2>/dev/null || true
fi

echo "==> HTTPS enabled for $DOMAIN"
