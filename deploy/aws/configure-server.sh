#!/usr/bin/env bash
# Configure the server: env file, systemd service, nginx, firewall.
set -euo pipefail
cd "$(dirname "$0")/../.."
APP_DIR="${APP_DIR:-/opt/devlog}"
DATA_DIR="${DATA_DIR:-/var/lib/devlog}"
DOMAIN="${1:-localhost}"

echo "==> Configuring Devlog server (domain hint: $DOMAIN)"

# .env
if [ ! -f "$APP_DIR/.env" ]; then
  SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))' 2>/dev/null || openssl rand -hex 48)"
  cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
DATA_DIR=$DATA_DIR
SESSION_SECRET=$SECRET
COOKIE_SECURE=true
TRUST_PROXY=1
LOG_LEVEL=info
EOF
  chmod 600 "$APP_DIR/.env"
  chown devlog:devlog "$APP_DIR/.env" 2>/dev/null || true
  echo "==> Created $APP_DIR/.env with a generated SESSION_SECRET"
else
  echo "==> $APP_DIR/.env already exists — leaving unchanged"
fi

# systemd
install -m 644 deploy/systemd/devlog.service /etc/systemd/system/devlog.service
sed -i "s|__APP_DIR__|$APP_DIR|g; s|__DATA_DIR__|$DATA_DIR|g" /etc/systemd/system/devlog.service
systemctl daemon-reload
echo "==> Installed systemd unit 'devlog'"

# nginx site
DOMAIN="${DOMAIN:-localhost}"
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/devlog /etc/nginx/sites-enabled/devlog
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "==> Configured nginx for $DOMAIN"

# Firewall (ufw) — optional, only if ufw is active or available
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  echo "==> UFW rules ensured (22, 80, 443)"
fi

echo "==> Server configured. Run: systemctl enable --now devlog"
