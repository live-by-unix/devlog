# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 1.x     | Yes       |

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately via GitHub Security Advisories ("Report a vulnerability" on the repository's Security tab), or contact the maintainer directly.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security architecture

Devlog implements defense-in-depth:

- **Passwords:** Argon2id hashing (`@node-rs/argon2`, 19 MiB memory cost)
- **Sessions:** random 256-bit tokens, stored as SHA-256 hashes, HTTP-only cookies, idle + absolute expiry
- **CSRF:** double-submit cookie with HMAC signature on all mutating endpoints
- **Rate limiting:** login, registration, and posting limiters
- **Headers:** Helmet CSP, nosniff, frame-ancestors none
- **Uploads:** memory-buffered validation, magic-byte checks for images, blocked executable extensions, randomized stored filenames, path-traversal-safe serving
- **Authorization:** every admin endpoint requires `role === "admin"` server-side; download permissions enforced per-file
- **Storage:** atomic writes, `.bak` recovery, corruption detection — never silently overwrites bad data
- **Validation:** Zod schemas on every API input

See `docs/SECURITY.md` for the full write-up.
