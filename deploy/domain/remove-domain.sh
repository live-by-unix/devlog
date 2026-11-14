#!/usr/bin/env bash
# Remove a custom domain: revert nginx to default and remove certs.
# Usage: ./deploy/domain/remove-domain.sh example.com
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain>}"

# Remove certs
certbot delete --cert-name "$DOMAIN" 2>/dev/null || true

# Revert nginx to a default localhost config
cat > /etc/nginx/sites-available/devlog <<'EOF'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 110m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/devlog /etc/nginx/sites-enabled/devlog
nginx -t && systemctl reload nginx
echo "Domain $DOMAIN removed. Update DNS records at your registrar if desired."
