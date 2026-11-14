# Domain Configuration

```bash
./deploy/domain/configure-domain.sh devlog.example.com --with-www
./deploy/domain/verify-dns.sh devlog.example.com
./deploy/domain/setup-ssl.sh devlog.example.com
```

## DNS records to create

```
A     devlog.example.com      → <server-ip>
A     www.devlog.example.com  → <server-ip>   (with --with-www)
```

The scripts explain records, verify resolution, configure nginx, and issue certs. They cannot modify DNS at arbitrary registrars — use `--cloudflare` for that (see CLOUDFLARE.md).

See deploy/domain/README.md for details.
