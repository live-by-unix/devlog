# Domain Configuration

Connect a custom domain (e.g. `devlog.example.com`) to your Devlog server.

## Quick start

```bash
./deploy/domain/configure-domain.sh devlog.example.com --with-www
./deploy/domain/verify-dns.sh devlog.example.com
./deploy/domain/setup-ssl.sh devlog.example.com
```

## What each script does

| Script | Purpose |
|---|---|
| `configure-domain.sh` | Validates domain, shows required DNS records, optionally writes them via Cloudflare API, configures nginx |
| `verify-dns.sh` | Resolves A/AAAA records and compares them to the server IP |
| `setup-nginx-domain.sh` | Writes the nginx server block for the domain |
| `setup-ssl.sh` | Verifies DNS, then issues a Let's Encrypt cert with HTTP→HTTPS redirect |
| `renew-ssl.sh` | Manual cert renewal (certbot.timer normally handles this) |
| `remove-domain.sh` | Removes the domain config and certificate |

## DNS records

At your registrar/DNS provider create:

```
Type   Name              Value
A      devlog            <server-public-ip>
A      www (optional)    <server-public-ip>
AAAA   (optional)        <server-ipv6>
```

Propagation can take minutes to 48 hours. `verify-dns.sh` tells you when records match.

## Cloudflare (optional)

Automate DNS record creation with a least-privilege API token:

```bash
export CF_API_TOKEN="..."   # Zone → DNS → Edit, scoped to your zone
export CF_ZONE_ID="..."      # zone ID from the Cloudflare dashboard
./deploy/domain/configure-domain.sh devlog.example.com --with-www --cloudflare
```

The script only creates/updates A records for your domain — it never touches other records.

If you proxy through Cloudflare (orange cloud), keep SSL mode "Full (strict)".

## HTTPS

`setup-ssl.sh` uses Certbot + the nginx plugin. It refuses to claim success unless the certificate was issued and nginx reloaded cleanly. Renewal is automatic via `certbot.timer`; `renew-ssl.sh` forces it manually.
