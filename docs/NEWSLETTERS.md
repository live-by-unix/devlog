# Newsletters

Newsletters are dated articles (updates, announcements, deep dives). No email delivery is built in — they're published on the site.

## Creating

`/admin/newsletters/new` or `POST /api/v1/admin/newsletters`:

- **Title**, **short description** (card text), **content** (Markdown)
- **Cover image** (optional upload)
- **Status**: draft / published

## Public pages

- `/newsletters` — paginated card grid
- `/newsletters/:id` — full article
- Homepage shows up to 3 cards: latest, second-latest, and a random older one (never duplicating when possible)
- `/feed/newsletters.xml` — RSS feed

Each newsletter has its own discussion board at `/discussions/newsletters/:id`.
