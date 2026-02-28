# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Knitly (slash.cash) is a personal finance tracking platform. It's a Turborepo + pnpm monorepo with two Next.js apps and several shared packages. See `README.md` for full architecture.

### Services

| Service | Port | Command | Notes |
|---------|------|---------|-------|
| `apps/main` (core app) | 3000 | `pnpm --filter @knitly/main dev` | Requires Supabase env vars for auth; starts even with placeholder values |
| `apps/website` (marketing) | 3001 | `pnpm --filter @knitly/website dev` | No env vars needed, fully static |
| Both together | 3000, 3001 | `pnpm dev` | Runs via Turborepo |

### Environment variables

The main app requires `.env.local` at `apps/main/.env.local` with at minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

Without real Supabase credentials, the app starts but auth/DB-dependent routes will fail at runtime. The website app needs no env vars.

### Lint, build, test

Standard commands are in root `package.json`: `pnpm lint`, `pnpm build`, `pnpm test`. Pre-existing lint warnings exist in `@workspace/ui` and `@workspace/evals` (both use `--max-warnings 0`); these are not regressions.

### Gotchas

- pnpm 10 blocks postinstall scripts by default. The `pnpm.onlyBuiltDependencies` field in root `package.json` allowlists `esbuild`, `sharp`, `protobufjs`, and `core-js-pure`. If a new native dependency is added, it must be added there too or `pnpm install` will silently skip its build step.
- The database package (`packages/database/src/index.ts`) initializes a Postgres connection at module-load time using `DATABASE_URL`. Any import of `@workspace/database` will fail if `DATABASE_URL` is not set.
- `apps/main` uses `next dev --turbopack` (Turbopack) for development, so Webpack-only plugins won't apply in dev mode.
- The main app redirects unauthenticated users to `/login` via Supabase middleware. The `/register` route is also behind this redirect unless the middleware is updated.
