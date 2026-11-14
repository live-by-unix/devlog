#!/usr/bin/env bash
# Configure a custom domain for Devlog.
# Usage: ./deploy/domain/configure-domain.sh example.com [--with-www] [--cloudflare]
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> [--with-www] [--cloudflare]}"
WITH_WWW="${2:-}"
USE_CF="${3:-}"
[ "$WITH_WWW" = "--cloudflare" ] && { USE_CF="--cloudflare"; WITH_WWW=""; }
[ "$USE_CF" = "--with-www" ] && { WITH_WWW="--with-www"; USE_CF=""; }

# Validate domain format
if ! [[ "$DOMAIN" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]; then
  echo "Invalid domain: $DOMAIN" >&2
  exit 1
fi

SERVER_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
echo "==> Domain: $DOMAIN"
echo "==> This server's public IP: $SERVER_IP"
echo ""
echo "Required DNS records at your registrar:"
echo "  A     $DOMAIN      -> $SERVER_IP"
[ "$WITH_WWW" = "--with-www" ] && echo "  A     www.$DOMAIN  -> $SERVER_IP"
echo "  (AAAA records if you have IPv6)"
echo ""

if [ "$USE_CF" = "--cloudflare" ]; then
  if [ -z "${CF_API_TOKEN:-}" ] || [ -z "${CF_ZONE_ID:-}" ]; then
    echo "Cloudflare mode requires CF_API_TOKEN and CF_ZONE_ID env vars." >&2
    echo "Create a least-privilege token: Zone.DNS Edit for the zone only." >&2
    exit 1
  fi
  echo "==> Creating/updating DNS records via Cloudflare API"
  for host in "$DOMAIN" $( [ "$WITH_WWW" = "--with-www" ] && echo "www.$DOMAIN" ); do
    # find existing A record
    EXISTING=$(curl -fsS "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records?type=A&name=$host" \
      -H "Authorization: Bearer $CF_API_TOKEN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["result"][0]["id"] if d.get("result") else "")')
    if [ -n "$EXISTING" ]; then
      curl -fsS -X PUT "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$EXISTING" \
        -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
        -d "{\"type\":\"A\",\"name\":\"$host\",\"content\":\"$SERVER_IP\",\"proxied\":false}" >/dev/null
      echo "    updated A record for $host"
    else
      curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
        -d "{\"type\":\"A\",\"name\":\"$host\",\"content\":\"$SERVER_IP\",\"proxied\":false}" >/dev/null
      echo "    created A record for $host"
    fi
  done
else
  echo "Tip: re-run with --cloudflare and CF_API_TOKEN/CF_ZONE_ID to automate DNS."
fi

# Configure nginx for the domain
./deploy/domain/setup-nginx-domain.sh "$DOMAIN" ${WITH_WWW:+${WITH_WWW#--}}
echo ""
echo "==> Next: verify DNS then enable HTTPS:"
echo "    ./deploy/domain/verify-dns.sh $DOMAIN $SERVER_IP"
echo "    ./deploy/domain/setup-ssl.sh $DOMAIN"
