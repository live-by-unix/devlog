#!/usr/bin/env bash
# Devlog — install prerequisites on Ubuntu/Debian (EC2 or VPS).
# Safe to re-run. Run as root or with sudo.
set -euo pipefail

APP_USER="devlog"
APP_DIR="/opt/devlog"
DATA_DIR="/var/lib/devlog"
NODE_MAJOR=22

echo "==> Devlog installer"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (or via sudo)." >&2
  exit 1
fi

. /etc/os-release
case "$ID" in
  ubuntu|debian) ;;
  *) echo "Unsupported OS: $ID. Ubuntu/Debian required." >&2; exit 1 ;;
esac
echo "==> Detected $PRETTY_NAME"

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg nginx certbot python3-certbot-nginx ufw tar gzip

# Node.js LTS via NodeSource
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  echo "==> Installing Node.js $NODE_MAJOR LTS"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
echo "==> Node $(node --version), npm $(npm --version)"

# Application user & directories
echo "==> Creating user and directories"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR" "$DATA_DIR" /var/log/devlog /var/backups/devlog
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$DATA_DIR" /var/log/devlog /var/backups/devlog
chmod 750 "$DATA_DIR" /var/log/devlog /var/backups/devlog

# Deploy user SSH key note (for deploy.sh over SSH)
echo "==> Done. Next steps:"
echo "    1. Copy the application files to $APP_DIR (see deploy/aws/deploy.sh)"
echo "    2. Create $APP_DIR/.env with SESSION_SECRET (see .env.example)"
echo "    3. ./deploy/aws/configure-server.sh"
