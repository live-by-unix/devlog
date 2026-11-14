#!/usr/bin/env bash
# Verify DNS then issue a Let's Encrypt certificate for the domain.
# Usage: ./deploy/domain/setup-ssl.sh example.com [www.example.com]
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> [extra-domain]}"
EXTRA="${2:-}"

# Verify DNS first
./deploy/domain/verify-dns.sh "$DOMAIN" || {
  echo "DNS verification failed — fix records before requesting a certificate." >&2
  exit 1
}

certbot --nginx -d "$DOMAIN" ${EXTRA:+-d "$EXTRA"} --non-interactive --agree-tos --redirect \
  -m "${CERTBOT_EMAIL:-admin@$DOMAIN}" || {
  echo "Certificate issuance failed." >&2
  exit 1
}

# Ensure secure cookies
ENV_FILE="${APP_DIR:-/opt/devlog}/.env"
if [ -f "$ENV_FILE" ] && ! grep -q "^COOKIE_SECURE=true" "$ENV_FILE"; then
  echo "COOKIE_SECURE=true" >> "$ENV_FILE"
  systemctl restart devlog 2>/dev/null || true
fi

echo "==> HTTPS is active for $DOMAIN"
certbot certificates | grep -A3 "$DOMAIN" || true
