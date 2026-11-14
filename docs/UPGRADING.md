# Upgrading

## Standard upgrade

```bash
cd /path/to/devlog
git pull
npm install
./build.sh
./stop-prod.sh && ./start-prod.sh
```

`data/` is untouched — upgrades preserve all content. Migrations run automatically at startup (`runMigrations` in `apps/server/src/storage/db.ts`); bump `INSTALLATION_VERSION` in `packages/shared` when the schema changes.

## Server upgrade (systemd)

```bash
./deploy/aws/update.sh        # backs up data, builds, restarts, health-checks, auto-rollback on failure
./deploy/aws/rollback.sh      # manual rollback to previous build (data untouched)
```

## Downgrading

Restoring an older app version is safe if the storage schema didn't change. If it did, restore a pre-upgrade `data/` backup too (`./restore.sh`).

## Before upgrading

```bash
./backup.sh    # always
```
