# Repository guidelines

- **Product**: slash.cash — local-first personal finance dashboard (Next.js, SQLite, Drizzle ORM, tRPC v11, deterministic Swiggy ingest, optional assistant AI).
- **Monorepo**: pnpm workspaces + Turborepo. Root package name: `slash-cash`.
- **Chat replies**: Prefer repo-root-relative paths (e.g. `apps/main/trpc/init.ts`); avoid absolute machine paths.

## Project structure

```text
.
├── apps/
│   ├── main/              # @knitly/main — dashboard (Next.js App Router, tRPC, AI UI)
│   └── website/           # Marketing site (no DB / tRPC / AI)
└── packages/
    ├── cli/               # slashcash CLI (slashcash package)
    ├── database/          # @workspace/database — SQLite schema, migrations, all queries
    ├── tasks/             # Local ingestion, Gmail sync helpers, deterministic extraction
    ├── ui/                # @workspace/ui — shared UI (shadcn-style)
    ├── e2e-tests/         # Playwright + architecture checks
    ├── evals/             # Local extraction evaluations
    ├── docs/              # Internal docs / roadmap
    ├── eslint-config/     # @workspace/eslint-config
    └── typescript-config/ # @workspace/typescript-config
```

## Local runtime (no hosted auth by default)

- **SQLite**: default DB at `~/.slashcash/db.sqlite` (override with `SQLITE_DB_PATH` or `SLASHCASH_HOME`).
- **Attachments**: `~/.slashcash/attachments` (per product docs).
- **Assistant providers**: configured after onboarding with `slashcash assistant`; ingest does not require Ollama or any model.
- **Dashboard**: typically `http://127.0.0.1:3000` via `pnpm --filter @knitly/main dev` or `pnpm slashcash -- start`.

Do not assume Supabase, Trigger.dev, or other hosted services unless the user explicitly asks to add them.

## Architecture boundaries

### `apps/main` (@knitly/main)

- Next.js App Router UI, tRPC server + client, AI chat using Vercel AI SDK v5 (`ai` package) and `@ai-sdk/react` for hooks.
- **tRPC**: routers live under `apps/main/trpc/routers/`; composition in `trpc/routers/_app.ts`. Context uses a local single-user id (`LOCAL_USER_ID` from `@workspace/database`) — not hosted JWT/SSR auth.
- **Data access**: call **only** exported functions from `@workspace/database` inside procedures — no `db.select` / raw Drizzle in routers or components.
- **Imports**: use `@workspace/ui`, `@workspace/database`, `@workspace/tasks` as needed; do not import `apps/website`.

### `apps/website`

- Static/lightweight marketing. **No** `@workspace/database`, **no** tRPC, **no** AI runtime.

### `packages/database` (@workspace/database)

- **Single source of truth** for SQLite schema (`src/schema/`), Drizzle client (`src/client.ts`), migrations, and **all** query helpers (`src/queries/**`).
- Routers and apps must not duplicate SQL/Drizzle logic — add a typed function here and export from `src/index.ts`.

### `packages/tasks`

- Long-running or batch work: Gmail sync and deterministic extraction under `packages/tasks/src/`. The `trigger/` folder name is **local** job wiring, not Trigger.dev.

### `packages/cli` (slashcash)

- CLI entry: onboarding, doctor, db, sync, start. See root `README.md` for `pnpm slashcash -- …` examples.

### `packages/ui` (@workspace/ui)

- Shared components; keep app-specific wiring in `apps/main`.

## Build, test, and development commands

- **Install**: `pnpm install` (Node ≥20, pnpm 10.4.1+ per `package.json`).
- **Dev dashboard**: `pnpm --filter @knitly/main dev`
- **Dev CLI**: `pnpm slashcash -- start` (or `pnpm --filter slashcash dev -- …`)
- **Typecheck / lint / test (monorepo)**: `pnpm typecheck`, `pnpm lint`, `pnpm test`
- **Quality gates**: `pnpm architecture-smells`, `pnpm fixtures:check`
- **E2E gates**: `pnpm e2e:ingest`, `pnpm e2e:cli`, `pnpm e2e:pyramid`, `pnpm e2e:release`, `pnpm e2e:onboarding`, or `pnpm e2e:all`
- **Evals**: `pnpm eval:gate`
- **Bench**: `pnpm bench`
- **DB** (from README): `pnpm --filter @workspace/database build`, `pnpm --filter slashcash dev -- db seed`

If commands fail from missing deps, run `pnpm install` once and retry.

## Coding conventions

- **TypeScript**: strict; avoid `any`; prefer explicit types at API boundaries.
- **AI SDK**: use **Vercel AI SDK 5.x** (`ai` package version aligned with repo). Use `@ai-sdk/react` for React hooks — not legacy `ai/react` import paths unless the codebase already uses a specific pattern.
- **tRPC v11**: use `initTRPC`, `createTRPCRouter`, procedures from `apps/main/trpc/init.ts`; compose routers in `trpc/routers/_app.ts`.
- **Validation**: Zod (or existing schemas) for procedure inputs where applicable.
- **Formatting**: `pnpm format` at root (Prettier on `**/*.{ts,tsx,md}`).

## Progressive disclosure

- Repo-wide rules: this file.
- App-specific Next.js + tRPC + AI client patterns: `apps/main/AGENTS.md`.
- Reusable workflows: `.agents/skills/*/SKILL.md`.

## Safety rails

- Do not add database queries outside `packages/database`.
- Do not add hosted auth, cloud DB, or Trigger.dev-style task platforms without an explicit product decision and dependency review.
- **Active pivot (2026-04-22):** Gmail access now goes through IMAP + a user-generated app password (ADR-024), and onboarding runs through an interactive `@clack/prompts` wizard (ADR-025). See [`packages/docs/roadmap/pivot-imap.md`](./packages/docs/roadmap/pivot-imap.md) for the active execution plan. Do not add new retired Google mailbox tooling anywhere outside `packages/docs/` (where the superseded ADRs live).
- When changing schema, use Drizzle generate/migrate flows from `packages/database` (`package.json` scripts: `generate`, `migrate`).
