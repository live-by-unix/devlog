# Environment Variables

See `.env.example` for the full annotated list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `production` enables static serving + strict secret check |
| `PORT` | `3001` | Listen port |
| `HOST` | `127.0.0.1` | Bind address (`0.0.0.0` behind a proxy) |
| `DATA_DIR` | `./data` | Persistent data directory |
| `SESSION_SECRET` | dev value | **Required in production** — signs CSRF tokens; ≥32 chars |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS (sets Secure cookie flag) |
| `TRUST_PROXY` | `1` | Proxy hops for correct client IPs |
| `ALLOWED_ORIGINS` | empty | Comma-separated CORS origins (same-origin needs none) |
| `MAX_UPLOAD_MB` | `100` | Upload cap (overridable in admin settings) |
| `MAX_IMAGE_MB` | `5` | Image cap |
| `SESSION_TTL_DAYS` | `30` | Absolute session lifetime |
| `SESSION_IDLE_HOURS` | `72` | Idle timeout |
| `LOG_LEVEL` | `info` | `debug`/`info`/`warn`/`error` |
| `WEB_DIST_DIR` | `apps/web/dist` | Built frontend location (production) |
| `CF_API_TOKEN`, `CF_ZONE_ID` | — | Optional Cloudflare DNS (deploy scripts only) |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env`. In production the server refuses to start with a weak/missing `SESSION_SECRET`.
