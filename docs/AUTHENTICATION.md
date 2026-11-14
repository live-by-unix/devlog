# Authentication

Native username/password auth — no external providers.

## Accounts

- **Administrator** — created once during first-time setup. Full dashboard access.
- **User** — self-registers at `/register`. Can post in discussions, download sign-in-only files, manage own account.

Public registration can never create admin accounts.

## Passwords

- Hashed with **Argon2id** (`@node-rs/argon2`, ~19 MiB memory, 2 iterations).
- Policy: min 10 chars, at least one letter and one number (configurable in `data/config/security.json`).

## Sessions

- 256-bit random token in an HTTP-only `devlog_session` cookie (`SameSite=Lax`, `Secure` when `COOKIE_SECURE=true`).
- Only the SHA-256 hash is stored server-side — a leaked `users.json`/`sessions.json` doesn't expose usable tokens.
- Absolute expiry (`SESSION_TTL_DAYS`, default 30) + idle timeout (`SESSION_IDLE_HOURS`, default 72).
- Logout deletes the session server-side; password change invalidates all sessions.

## CSRF

All non-GET `/api/v1` requests require `X-CSRF-Token` matching the signed `devlog_csrf` cookie (double-submit + HMAC). The web client's `api()` helper handles this automatically.

## Rate limiting

- Login: 20 attempts / 15 min per IP
- Register: 10 / hour per IP
- Posting: 30 / min per IP

## Suspended users

Admins can suspend accounts (`/admin/users`); suspended users can't log in and their sessions are destroyed.
