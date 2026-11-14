# API Reference

Base URL: `/api/v1` — JSON in/out. Errors: `{"error":{"code","message","details?"}}`.

## Meta

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/status` | — | `{initialized, version, maintenance, project:{name,faviconPath,imagePath}}` |
| GET | `/health` | — | Liveness (`/health`, `/ready` also at root) |
| GET | `/ready` | — | Readiness |
| POST | `/setup` | — (uninitialized only) | Create admin + optional project. Body: `{username,password,confirmPassword,project?}` |
| POST | `/setup/project` | admin session | Save project config |

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | `{username,password,confirmPassword}` → creates user + session |
| POST | `/auth/login` | `{username,password}` → session cookie |
| POST | `/auth/logout` | Destroy session |
| GET | `/auth/me` | Current user or null |
| POST | `/auth/password` | `{currentPassword,newPassword,confirmPassword}` |

## Content (public)

| Method | Path | Description |
|---|---|---|
| GET | `/project` | Public project info |
| GET | `/home` | Homepage aggregate (project + 3 newsletters + 4 releases) |
| GET | `/releases?page=&pageSize=` | Published releases, paginated |
| GET | `/releases/:id` | Release detail incl. file list |
| GET | `/releases/:id/files/:fileId/download` | Download (permission-checked) |
| GET | `/newsletters?page=&pageSize=` | Published newsletters |
| GET | `/newsletters/:id` | Newsletter detail |
| GET | `/discussions/threads?scope=&targetId=&page=` | Threads for a board |
| GET | `/discussions/threads/:id` | Thread + nested replies |

## Discussions (auth for writes)

| Method | Path | Description |
|---|---|---|
| POST | `/discussions/threads` | `{scope:"release"\|"newsletter",targetId,title,content}` |
| POST | `/discussions/threads/:id/replies` | `{content,parentId?}` (max depth 4) |
| PATCH | `/discussions/threads/:id` | Edit own thread (admin: any) `{content,title?}` |
| DELETE | `/discussions/threads/:id` | Delete own thread (admin: any) |
| PATCH | `/discussions/replies/:id` | Edit own reply `{content}` |
| DELETE | `/discussions/replies/:id` | Delete own reply |
| POST | `/discussions/reports` | `{targetType:"thread"\|"reply",targetId,reason}` |

## Admin (`/admin/*`, requires admin role)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard counts + recent items |
| GET/PUT | `/admin/project` | Project config |
| GET/POST | `/admin/releases` | List / create |
| GET/PUT/DELETE | `/admin/releases/:id` | Detail / update / delete |
| PATCH | `/admin/releases/:id/status` | `{status:"draft"\|"published"}` |
| POST | `/admin/releases/:id/files` | multipart `file` + `permission` |
| DELETE | `/admin/releases/:id/files/:fileId` | Remove file |
| GET/POST | `/admin/newsletters`, GET/PUT/DELETE `/admin/newsletters/:id` | CRUD |
| PATCH | `/admin/newsletters/:id/status` | Publish/unpublish |
| GET/PATCH/DELETE | `/admin/threads[/:id]`, `/admin/threads/:id/lock`, `/admin/replies/:id` | Moderation |
| GET/PATCH | `/admin/reports[/:id]` | Report queue |
| GET/PATCH/DELETE | `/admin/users[/:id]` | User management |
| POST | `/admin/uploads/image?kind=favicon\|project\|newsletter` | multipart `file` |
| GET/PUT | `/admin/settings` | App settings |

## Media & SEO

| Path | Description |
|---|---|
| GET | `/api/v1/media/uploads/...` | Public images (favicon/project/newsletter) |
| GET | `/sitemap.xml`, `/robots.txt` | SEO |
| GET | `/feed/releases.xml`, `/feed/newsletters.xml` | RSS |
