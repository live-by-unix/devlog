# Development

## Layout

```
apps/web        React + Vite + Tailwind frontend
apps/server     Express + TypeScript API
packages/shared Zod schemas & shared types
tests/e2e       Playwright end-to-end tests
deploy/         AWS + domain deployment scripts
docs/           Documentation
```

## Commands

```bash
./start.sh        # dev servers (API :3001, Vite :5173)
./dev.sh          # same as start.sh
npm run typecheck # strict TS check, all workspaces
npm test          # vitest unit + integration tests
npm run build     # production build
./build.sh        # typecheck + test + build
./test.sh         # tests only
```

## Conventions

- TypeScript strict mode everywhere.
- API input validated with Zod schemas from `@devlog/shared`.
- All persistence goes through `apps/server/src/storage/` — JSON files with atomic writes.
- Frontend talks to `/api/v1/*`; in dev Vite proxies `/api` to `localhost:3001`.
- Mutating API calls require the `X-CSRF-Token` header matching the `devlog_csrf` cookie (the `api()` helper in `apps/web/src/api.ts` handles this).

## E2E tests

```bash
cd tests/e2e
npm install
npx playwright install chromium
npx playwright test
```

The suite boots a production build on port 4173 via `scripts/e2e-server.sh`.
