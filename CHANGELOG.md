# Changelog

All notable changes to Devlog are documented here.

## [1.0.0] - 2026-11-14

### Added
- Complete self-hosted project publishing platform
- First-time setup wizard (admin account + project configuration)
- Public website: hero, project info, releases, newsletters, discussions
- Release management with multiple downloadable files and per-file permissions
- Newsletter system with cover images and Markdown content
- Discussion boards per release/newsletter with nested replies, reporting, moderation, locking
- Native authentication (Argon2id, secure sessions, CSRF, rate limiting)
- Admin dashboard: overview, project, releases, newsletters, discussions, users, settings
- JSON file-based storage with atomic writes and corruption recovery
- REST API v1 with Zod validation
- Markdown rendering (GFM) with DOMPurify sanitization
- Light/dark themes, responsive design
- RSS feeds, sitemap.xml, robots.txt
- Docker + docker-compose support
- AWS EC2 deployment scripts (install, deploy, update, rollback, backup, restore, systemd, nginx, SSL)
- Domain configuration scripts with optional Cloudflare DNS integration
- Backup/restore scripts
- Vitest unit + integration tests, Playwright e2e tests
- GitHub Actions CI
