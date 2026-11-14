#!/usr/bin/env bash
# Apply the nginx reverse-proxy config for Devlog.
set -euo pipefail
DOMAIN="${1:-localhost}"
cat > /etc/nginx/sites-available/devlog <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 110m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/devlog /etc/nginx/sites-enabled/devlog
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configured for $DOMAIN"
