# Project Setup

Devlog hosts exactly one project. Configure it during first-time setup or later at `/admin/project` (or `PUT /api/v1/admin/project`).

## Fields

| Field | Required | Notes |
|---|---|---|
| Name | ✓ | Program name shown everywhere |
| Description | | Short intro on the homepage |
| Type | ✓ | Predefined list or custom text |
| Proprietary/Open source | via License | License picker: MIT, Apache-2.0, GPL-3.0/2.0, LGPL-3.0, BSD-2/3-Clause, MPL-2.0, AGPL-3.0, Other (custom name) |
| GitHub repository URL | | Optional |
| Website URL | | Optional |
| Store page URL | | Optional |
| Made by | | Company/org/individual |
| Developer GitHub | | Optional profile link |
| Favicon | | Upload (png/jpg/gif/webp/svg/ico) — shown in header |
| Product image | | Upload — hero image on homepage |

## Images

Upload via the admin UI or `POST /api/v1/admin/uploads/image?kind=favicon|project|newsletter` (multipart field `file`). Images are validated (type + magic bytes), stored under `data/uploads/`, and served via `/api/v1/media/`.

## Editing later

`/admin/project` — changes apply immediately to the public site.
