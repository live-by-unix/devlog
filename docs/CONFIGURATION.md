# Configuration

Two layers: environment variables (`.env`) and runtime settings (admin UI / `data/config/settings.json`).

## Runtime settings (`/admin/settings`)

| Setting | Default | Range |
|---|---|---|
| Max file upload | 100 MB | 1–2048 MB |
| Max image size | 5 MB | 1–100 MB |
| Session lifetime | 30 days | 1–365 |
| Session idle timeout | 72 h | 1–720 |
| Maintenance mode | off | bool — blocks public writes |

Password policy lives in `data/config/security.json` (min length 10, letter+number required).

## Data files

- `data/config/project.json` — project info
- `data/config/settings.json` — runtime settings above
- `data/config/security.json` — password policy
- `data/metadata/installation.json` — version + install timestamp
