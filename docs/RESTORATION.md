# Restoration

## Restore on the same server

```bash
./restore.sh backups/devlog-backup-XXX.tar.gz          # prompts before overwriting
./restore.sh backups/devlog-backup-XXX.tar.gz --force  # non-interactive
```

The script backs up current `data/` first, extracts the archive, and tells you to restart Devlog.

On a server: `deploy/aws/restore.sh <archive> [--force]` stops the service, restores, and restarts it.

## Move to a new server

1. Deploy the same (or newer compatible) Devlog version on the new server.
2. `backup.sh` on the old server; copy the archive over.
3. `restore.sh` on the new server.
4. Update `SESSION_SECRET`? Sessions won't transfer meaningfully — users just log in again. Keep the same secret if you want CSRF continuity; it doesn't matter much.
5. Start the app; verify `/health` and `/ready`.

## After restore

- Users, content, uploads, and settings return exactly as backed up.
- `data/logs/` may contain stale logs — harmless.
