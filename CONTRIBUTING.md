# Contributing to Devlog

Thanks for your interest in contributing!

## Development setup

```bash
npm install
./start.sh        # or: npm run dev
```

- Frontend: `apps/web` (React + Vite)
- Backend: `apps/server` (Express + TypeScript)
- Shared schemas/types: `packages/shared`

## Before submitting

```bash
npm run typecheck   # must pass
npm test            # must pass
npm run build       # must pass
```

## Guidelines

- Follow existing code style (TypeScript strict, compact).
- Validate all input with Zod schemas in `packages/shared`.
- Never log secrets, passwords, session tokens, or cookies.
- All persistent data goes through the storage layer in `apps/server/src/storage/` — do not write ad-hoc JSON files.
- New API endpoints go under `/api/v1`, return the standard error shape, and require auth/authorization checks server-side.
- Update docs when behavior changes.

## Commits

Use clear, conventional-style messages. Keep commits focused.
