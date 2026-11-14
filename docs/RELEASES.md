# Releases

Releases are versioned snapshots of your software with optional downloads.

## Creating a release

`/admin/releases/new` or `POST /api/v1/admin/releases`:

- **Name**, **version** (e.g. `1.2.0`), **description** (Markdown, live preview)
- **GitHub Releases URL** (optional link)
- **Associated newsletter** (optional)
- **Status**: `draft` (hidden) or `published` (public)

Publishing sets `publishedAt`; unpublishing hides it again. The homepage shows the 4 most recent published releases.

## Downloadable files

After saving, upload files on the edit page (`POST /admin/releases/:id/files`). Each file has:

- Original display name, stored name (randomized), size, MIME type, upload date
- **Permission**:
  - `everyone` — anonymous download
  - `users` — requires sign-in (enforced server-side; anonymous gets 401)

Limits: `maxUploadMb` setting (default 100 MB/file). Executable/script extensions (.exe, .sh, .ps1, .js, …) are rejected. Files are served as `application/octet-stream` attachments — never executed.

## Public pages

- `/releases` — paginated list
- `/releases/:id` — detail with Markdown description, download buttons, link to its discussion board
- `/feed/releases.xml` — RSS feed

Every release gets its own discussion board at `/discussions/releases/:id`.
