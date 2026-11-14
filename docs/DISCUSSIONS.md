# Discussions

Every published release and newsletter has its own board.

## Permissions

| Action | Visitor | User | Admin |
|---|---|---|---|
| Read threads/replies | ✓ | ✓ | ✓ |
| Create thread | — | ✓ | ✓ |
| Reply | — | ✓ | ✓ |
| Edit/delete own posts | — | ✓ | ✓ |
| Edit/delete any post | — | — | ✓ |
| Lock threads | — | — | ✓ |
| Handle reports | — | — | ✓ |

All enforced server-side — visitors calling the API directly get 401/403.

## Features

- Nested replies up to 4 levels
- Markdown content (sanitized)
- Edited indicator on modified posts
- Thread locking (admins; also blocks the author)
- Post reporting → admin queue at `/admin/discussions`
- Reply counts, pagination
- Auto-refresh via polling (15s thread / 30s board)
- Rate limited posting (30/min)

## URLs

- `/discussions` — index of all boards
- `/discussions/releases/:releaseId` — release board
- `/discussions/newsletters/:newsletterId` — newsletter board
- `/discussions/:scope/:targetId/:threadId` — thread view
