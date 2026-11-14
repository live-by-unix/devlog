#!/usr/bin/env bash
# Verify DNS records point to this server.
# Usage: ./deploy/domain/verify-dns.sh example.com [expected-ip] [--www]
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> [expected-ip] [--www]}"
EXPECTED="${2:-}"
CHECK_WWW="${3:-}"
[ "$CHECK_WWW" = "--www" ] && CHECK_WWW=1 || CHECK_WWW=0

if [ -z "$EXPECTED" ]; then
  EXPECTED="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
fi
echo "==> Verifying $DOMAIN -> expected $EXPECTED"

FAIL=0
check_a() {
  local host="$1"
  local ips
  ips="$(getent ahostsv4 "$host" 2>/dev/null | awk '{print $1}' | sort -u || true)"
  if [ -z "$ips" ]; then
    ips="$(dig +short A "$host" 2>/dev/null | grep -E '^[0-9.]+$' || true)"
  fi
  if [ -z "$ips" ]; then
    echo "    ✗ $host: no A record found"
    FAIL=1
    return
  fi
  if echo "$ips" | grep -qx "$EXPECTED"; then
    echo "    ✓ $host -> $EXPECTED"
  else
    echo "    ✗ $host resolves to: $(echo $ips | tr '\n' ' ') (expected $EXPECTED)"
    FAIL=1
  fi
}

check_a "$DOMAIN"
[ "$CHECK_WWW" = "1" ] && check_a "www.$DOMAIN"

# AAAA (informational)
AAAA="$(dig +short AAAA "$DOMAIN" 2>/dev/null | head -3 || true)"
[ -n "$AAAA" ] && echo "    ℹ AAAA records present: $(echo $AAAA | tr '\n' ' ')"

if [ "$FAIL" = "0" ]; then
  echo "==> DNS verified. Note: propagation can take up to 48h; re-run if it fails."
  exit 0
else
  echo "==> DNS check FAILED. Check your registrar's A record and propagation." >&2
  exit 1
fi
