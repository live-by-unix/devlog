# API Authentication

## Sessions

Browser clients use cookies automatically. For non-browser clients:

1. `POST /api/v1/auth/login` with `{username,password}` — the response sets `devlog_session` (HTTP-only) and `devlog_csrf` cookies.
2. Send both cookies on subsequent requests.
3. For mutations, copy the `devlog_csrf` cookie value into the `X-CSRF-Token` header.

The CSRF cookie value looks like `token.signature` — send it verbatim.

## Errors

| Status | Code | Meaning |
|---|---|---|
| 400 | `validation_error` | Zod validation failed (`details` lists field errors) |
| 401 | `unauthorized` | Not signed in |
| 403 | `forbidden` / `csrf_failed` | Wrong role or missing/invalid CSRF token |
| 404 | `not_found` | Resource missing |
| 409 | `conflict` / `username_taken` / `duplicate_report` | State conflict |
| 413 | `file_too_large` | Upload exceeds limit |
| 429 | `rate_limited` | Too many requests |
| 503 | `maintenance` | Maintenance mode |

## Pagination

List endpoints return `{items,total,page,pageSize,totalPages}`. Query: `?page=1&pageSize=20` (max 100).
