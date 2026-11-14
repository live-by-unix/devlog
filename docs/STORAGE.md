# Storage

All persistent data lives in `data/` as JSON files — no database required.

```
data/
├── config/          project.json, settings.json, security.json
├── users/           users.json (Argon2id hashes)
├── sessions/        sessions.json (SHA-256 token hashes)
├── releases/        releases.json (incl. file metadata)
├── newsletters/     newsletters.json
├── discussions/     threads.json, replies.json, reports.json
├── uploads/         favicon/, project/, releases/, newsletters/
├── private/         reserved for future private files
├── logs/            app.log (JSON lines)
└── metadata/        installation.json
```

## Guarantees

- **Atomic writes** — temp file + rename; readers never see partial JSON.
- **Write serialization** — mutations per file are queued.
- **Corruption recovery** — previous good copy kept as `*.bak`; corrupted main file falls back to it. If both are bad, startup fails loudly rather than silently overwriting.
- **Missing files** — treated as empty collections; directories auto-created.
- **Permissions** — `data/` and config files created with restrictive modes.

## Reset behavior

Deleting `data/` resets the installation: on next start Devlog recreates the structure and shows the first-time setup wizard. **This destroys all users, content, and uploads — back up first** (see BACKUPS.md).

## Backups

`./backup.sh` creates a timestamped tarball of `data/`; `./restore.sh` restores it (see BACKUPS.md / RESTORATION.md).
