# Administration

Dashboard at `/admin` (admin role required — enforced server-side).

## Sections

- **Overview** — counts (releases, newsletters, users, threads, reports), recent content, data dir, maintenance flag
- **Project** — edit all project fields, upload favicon/product image
- **Releases** — list, create, edit, publish/unpublish, delete (with file management)
- **Newsletters** — same lifecycle
- **Discussions** — all threads, view content, lock/unlock, delete; report queue with resolve/dismiss
- **Users** — list accounts, suspend/restore, delete (last admin protected; own account protected)
- **Settings** — upload limits, session TTL/idle, maintenance mode, installation info

## Safety rails

- Cannot delete or suspend the last active admin
- Cannot delete your own account via the users page
- Deleting content requires confirmation dialogs
- Maintenance mode blocks public writes (GETs still work)

## Sessions & security

See SECURITY.md. Rotate `SESSION_SECRET` only with a planned re-login (it invalidates CSRF tokens, not sessions).
