# Troubleshooting

## App won't start

- `node --version` — needs >= 20
- `SESSION_SECRET` — in production must be ≥32 chars and not contain "change-me"
- Port in use — change `PORT` in `.env`
- Check `data/logs/app.log` and stdout

## Setup wizard keeps appearing

`data/` exists but `metadata/installation.json` says uninitialized — finish setup, or if `data/` was deleted, that's expected (fresh install).

## 403 "CSRF token missing"

API clients must send `X-CSRF-Token` equal to the `devlog_csrf` cookie on mutations. Browser clients handle this automatically.

## Can't log in

- Wrong password (Argon2id verify fails → generic 401)
- Account suspended (403 `account_suspended`)
- Rate limited (429) — wait 15 min

## Upload fails

- File too large → raise `maxUploadMb` in `/admin/settings` or `MAX_UPLOAD_MB`
- "Unsupported image type" → only png/jpg/gif/webp/svg/ico, verified by magic bytes
- Executable extensions are blocked for release files

## Downloads return 401

File permission is "Sign-in only" — sign in first.

## Discussions don't appear

Release/newsletter must be **published** for its board to exist. Deleting content removes its threads.

## Logs

- App: `data/logs/app.log` (JSON lines)
- Prod script: `logs/prod.log`
- Systemd: `journalctl -u devlog -f` or `./deploy/aws/logs.sh`
- Nginx: `/var/log/nginx/error.log`
