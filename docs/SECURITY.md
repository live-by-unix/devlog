# Security

Devlog is designed to be safe to expose to the public internet when deployed behind HTTPS.

## Implemented protections

| Threat | Mitigation |
|---|---|
| XSS | DOMPurify-sanitized Markdown (allowlist tags/attrs), React escaping, CSP via Helmet |
| CSRF | Double-submit signed cookie required on all mutations |
| Brute force | Argon2id hashing, login/register rate limits |
| Session theft | HTTP-only cookies, SHA-256-hashed session tokens at rest, idle+absolute expiry |
| Session fixation | New token issued on login |
| Path traversal | Randomized stored filenames; media serving restricted to `uploads/{favicon,project,newsletters}` with basename checks |
| Upload abuse | Size limits, extension blocklist (executables/scripts), magic-byte verification for images, SVG active-content rejection |
| Unauthorized downloads | Per-file permission (`everyone`/`users`) enforced server-side |
| Unauthorized admin | `requireAdmin` middleware on every `/admin/*` route |
| IDOR | Resources looked up by unguessable IDs + ownership checks |
| Injection | No SQL; Zod validation on all inputs; parameterized file paths |
| Secret exposure | `.env` gitignored; sessions/secrets never logged; `data/` never statically served |
| DoS | Request size limits (2 MB JSON, configurable upload caps), compression, pagination |

## Headers

Helmet sets CSP (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, etc.

## Operational hardening

- Run behind Nginx + HTTPS (see HTTPS.md)
- Set a strong `SESSION_SECRET`
- Restrict SSH to your IP; use the provided firewall script
- Keep Node.js and dependencies updated (`npm audit`)
- Back up `data/` regularly (BACKUPS.md)

## Reporting

See the repository SECURITY.md for how to report vulnerabilities.
