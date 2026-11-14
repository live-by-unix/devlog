# Backups

Everything worth backing up is in `data/` — users, sessions, releases, newsletters, discussions, uploads, config.

## Quick backup

```bash
./backup.sh
# → backups/devlog-backup-YYYYMMDDTHHMMSSZ.tar.gz
```

Backups go to `./backups/` (override with `BACKUP_DIR=`). Archives are validated after creation. On the server, `deploy/aws/backup.sh` writes to `/var/backups/devlog` and prunes to the last 30.

## Recommended schedule (cron)

```cron
0 3 * * * cd /opt/devlog && ./backup.sh
```

Then ship `backups/` off-server (S3, rsync, etc.).

## What to back up

- ✅ `data/` — everything persistent
- ✅ `.env` — your SESSION_SECRET (store separately, securely)
- ❌ `node_modules/`, `dist/` — rebuildable

## Consistency

JSON stores write atomically, so tar snapshots are crash-consistent. For extra safety stop the service during backup (`systemctl stop devlog`).
