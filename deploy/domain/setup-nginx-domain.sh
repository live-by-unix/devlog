#!/usr/bin/env bash
# Write the nginx server block for a custom domain.
# Usage: ./deploy/domain/setup-nginx-domain.sh example.com [www]
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> [www]}"
WITH_WWW="${2:-}"
SERVER_NAMES="$DOMAIN"
[ "$WITH_WWW" = "www" ] && SERVER_NAMES="$DOMAIN www.$DOMAIN"

if ! [[ "$DOMAIN" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]; then
  echo "Invalid domain" >&2; exit 1
fi

cat > /etc/nginx/sites-available/devlog <<EOF
server {
    listen 80;
    server_name $SERVER_NAMES;

    client_max_body_size 110m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/devlog /etc/nginx/sites-enabled/devlog
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configured for: $SERVER_NAMES"
