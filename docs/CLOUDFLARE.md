# Cloudflare (optional)

Automate DNS records via the Cloudflare API — strictly optional; manual DNS works fine.

## Setup

1. Cloudflare dashboard → your zone → API Tokens → create token with **Zone.DNS Edit** permission scoped to that zone only (least privilege).
2. Find your Zone ID (zone overview, right sidebar).

```bash
export CF_API_TOKEN="..."
export CF_ZONE_ID="..."
./deploy/domain/configure-domain.sh devlog.example.com --with-www --cloudflare
```

## Behavior

- Creates or updates A records for the domain (+ `www` with `--with-www`)
- Skips creation if an identical record exists; updates if the IP differs
- Never deletes or modifies unrelated records
- `proxied: false` — DNS-only, so Let's Encrypt HTTP-01 works directly

If you enable the orange-cloud proxy later, set SSL mode to **Full (strict)** and use Cloudflare Origin Certificates or keep Let's Encrypt (both work).

Credentials come only from environment variables — nothing is hardcoded or committed.
