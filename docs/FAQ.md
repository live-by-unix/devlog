# FAQ

**Does Devlog need a database?**
No — everything is JSON files in `data/`. Delete `data/` to reset the installation.

**Can I host multiple projects?**
One Devlog installation = one project. Run multiple instances (different `DATA_DIR`/`PORT`) for multiple projects.

**Do I need email?**
No email is required — auth is username/password only, newsletters are web publications.

**Can visitors download files without an account?**
Yes — set file permission to "Everyone". "Sign-in users" requires an account.

**How do I reset everything?**
Stop Devlog, delete `data/`, start again → setup wizard.

**Where are logs?**
`data/logs/app.log` (JSON lines), nginx `/var/log/nginx/`, systemd `journalctl -u devlog`.

**Is there an API?**
Yes — `/api/v1`, see API.md.

**Can I use Docker?**
Yes — `docker compose up -d`, see DOCKER.md.

**Cloudflare?**
Optional DNS automation via `deploy/domain/configure-domain.sh --cloudflare`, see CLOUDFLARE.md.
