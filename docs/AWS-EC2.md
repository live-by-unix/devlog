# AWS EC2 Deployment

Full guide in `deploy/aws/README.md`. Summary:

## Provision

- Ubuntu 24.04 LTS, t3.small+, 20 GB+ EBS
- Security group: 22 (your IP), 80, 443
- No IAM permissions needed

## Install

```bash
git clone <repo> /opt/devlog && cd /opt/devlog
./deploy/aws/install.sh            # node, nginx, user, dirs
./deploy/aws/configure-server.sh   # .env + systemd + nginx + ufw
./deploy/aws/deploy.sh /opt/devlog # build app
systemctl enable --now devlog
```

Open `http://<ip>/` → setup wizard.

## Operate

```bash
./deploy/aws/status.sh     # service status + logs
./deploy/aws/logs.sh       # follow logs
./deploy/aws/update.sh     # update with auto-rollback
./deploy/aws/backup.sh     # data backup → /var/backups/devlog
./deploy/aws/restore.sh <archive> --force
./deploy/aws/setup-ssl.sh example.com   # HTTPS
./deploy/aws/uninstall.sh [--purge-data]
```

The app binds 127.0.0.1:3001; only Nginx faces the internet.
