# HTTPS

Devlog itself is HTTP; TLS is terminated by Nginx + Let's Encrypt.

## Automatic (recommended)

```bash
./deploy/domain/setup-ssl.sh devlog.example.com
# or on EC2: ./deploy/aws/setup-ssl.sh devlog.example.com
```

This verifies DNS, runs `certbot --nginx`, installs the cert, enables HTTP→HTTPS redirect, and sets `COOKIE_SECURE=true` in `.env`.

## Manual

```bash
certbot --nginx -d devlog.example.com
```

## Renewal

`certbot.timer` renews automatically (deploy installs `python3-certbot-nginx`). Force with `./deploy/domain/renew-ssl.sh`.

## Checklist

- [ ] DNS A record points to the server
- [ ] Port 80 reachable (HTTP-01 challenge)
- [ ] `COOKIE_SECURE=true` in `.env` after cert issuance
- [ ] `systemctl restart devlog` if you changed `.env` manually
