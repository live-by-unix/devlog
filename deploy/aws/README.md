# Devlog on AWS EC2

Devlog runs as a Node.js app behind Nginx with systemd, persistent data on the instance's EBS volume, and HTTPS via Let's Encrypt.

## Recommended setup

- **OS:** Ubuntu 24.04 LTS (or Debian 12)
- **Instance:** t3.small (2 vCPU / 2 GB) is sufficient for most installs; t3.micro works for small sites
- **Storage:** 20+ GB gp3 EBS volume (holds `data/` — users, releases, uploads)
- **Security group:**
  - Inbound 22/tcp — **your IP only**
  - Inbound 80/tcp — 0.0.0.0/0 (needed for Let's Encrypt HTTP-01)
  - Inbound 443/tcp — 0.0.0.0/0
  - No other inbound ports. The Node app binds to 127.0.0.1:3001 and is only reachable via Nginx.
- **IAM:** no special permissions required — everything runs locally on the instance.

## Install

```bash
# On a fresh Ubuntu EC2 instance:
git clone <your-repo> /opt/devlog   # or rsync the repo
cd /opt/devlog
./deploy/aws/install.sh             # packages, Node 22, nginx, user, dirs
./deploy/aws/configure-server.sh    # .env, systemd, nginx, ufw
./deploy/aws/deploy.sh /opt/devlog  # build & install app
systemctl enable --now devlog
```

Open `http://<server-ip>/` — the first-run setup wizard appears.

## Scripts

| Script | Purpose |
|---|---|
| `install.sh` | System packages, Node.js LTS, app user, directories |
| `configure-server.sh` | `.env`, systemd unit, nginx site, firewall |
| `deploy.sh` | Copy/build/restart the app |
| `update.sh` | Update version, backup data first, auto-rollback on health-check failure |
| `rollback.sh` | Restore previous app version (data untouched) |
| `backup.sh` / `restore.sh` | Timestamped `data/` archives |
| `status.sh` / `logs.sh` | systemd status and journalctl |
| `uninstall.sh` | Remove app; `--purge-data` also deletes data |
| `setup-nginx.sh` | Re-apply nginx config |
| `setup-ssl.sh` | Let's Encrypt cert + HTTPS redirect |
| `configure-firewall.sh` | UFW: 22/80/443 only |

## Updates & rollback

`update.sh` always backs up `data/` and snapshots the app dir before deploying. If the health check fails after restart it automatically rolls back. `rollback.sh` manually restores the previous build without touching user data.

## Backups

Schedule `deploy/aws/backup.sh` via cron and ship archives to S3:

```cron
0 3 * * * /opt/devlog/deploy/aws/backup.sh
```

To move servers: `backup.sh` here → `restore.sh` there with the same app version.

## SSH hardening

- Use an EC2 key pair; disable password auth in `/etc/ssh/sshd_config`.
- Restrict port 22 to your IP in the security group.
- Consider AWS Systems Manager Session Manager instead of open SSH.
