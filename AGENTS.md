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
- **E2E**: Playwright journeys (`pnpm e2e:journeys` / `pnpm e2e:all`), plus `pnpm e2e:onboarding` for the fast-path script; `pnpm e2e:all` runs the browser suite then onboarding
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

## Agent workflow

Default AI SDLC for coding work is Matt Pocock’s size-gated pipeline. Product skills (`add-trpc-route`, `shadcn`, `ai-sdk`, `run-tests`, etc.) are on-demand helpers inside implement/verify — not alternate SDLCs.

**Small / clear** (localized fix, known destination):

`/grill-with-docs` → `/to-spec` → `/implement` (skip `/to-tickets` when one slice is enough)

**Big / foggy** (multi-session, unclear path):

`/wayfinder` → resolve the map (grilling tickets use `/grilling` + `/domain-modeling`) → `/to-spec` → `/to-tickets` → `/implement`

Rules:

- Wayfinder is **plan-only**. AFK implementation starts at `/implement` (drives `/tdd` and closes with `/code-review`).
- Verify with `/run-tests` and repo gates (`pnpm typecheck`, `pnpm test`, e2e as appropriate).
- Skill bodies live under `.agents/skills/*/SKILL.md`.
- Unfinished openclaw-style `orchestrator` / `autoreview` experiments are **retired**. Do not revive them without an explicit product decision.

## Agent skills

### Issue tracker

GitHub Issues via `gh` (repo: `Ravikumar911/knitly`). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `CONTEXT.md` when present, plus existing ADRs/glossary under `packages/docs/reference/`. See `docs/agents/domain.md`.

## Progressive disclosure

- Repo-wide rules: this file (including **Agent workflow** above).
- App-specific Next.js + tRPC + AI client patterns: `apps/main/AGENTS.md`.
- Reusable workflows: `.agents/skills/*/SKILL.md`.
- Agentic closeout plan: `packages/docs/roadmap/agentic-coding-adoption.md`.
- Closeout workflow: `.agents/skills/autoreview`; ingest proof workflow: `.agents/skills/ingest-proof`; high-level handoffs and ingest sweeps: `.agents/skills/orchestrator` plus `.agents/skills/ingest-edge-sweep`; living scenario contracts live under `qa/scenarios/` (Phase 5).

## Safety rails

- Do not add database queries outside `packages/database`.
- Do not add hosted auth, cloud DB, or Trigger.dev-style task platforms without an explicit product decision and dependency review.
- **Active pivot (2026-04-22):** Gmail access now goes through IMAP + a user-generated app password (ADR-024), and onboarding runs through an interactive `@clack/prompts` wizard (ADR-025). See [`packages/docs/roadmap/pivot-imap.md`](./packages/docs/roadmap/pivot-imap.md) for the active execution plan. Do not add new retired Google mailbox tooling anywhere outside `packages/docs/` (where the superseded ADRs live).
- When changing schema, use Drizzle generate/migrate flows from `packages/database` (`package.json` scripts: `generate`, `migrate`).
- For non-trivial changes, especially ingest/extraction work, follow the agentic closeout plan in `packages/docs/roadmap/agentic-coding-adoption.md` and run `.agents/skills/autoreview` before landing. For ingest/extraction work, also run `.agents/skills/ingest-proof` / `pnpm e2e:ingest`, update or cite the relevant `qa/scenarios/` contract, and include the evidence map, sibling analysis, and real behavior proof you used.
- For large ingest goals, ongoing maintenance, or "sweep/close/triage edge cases" requests, start from `.agents/skills/ingest-edge-sweep/SKILL.md` or `.agents/skills/orchestrator/SKILL.md` so work is decomposed into traceable candidates with worker reports, proof bundles, and autoreview closeout.

## ClawSweeper-Style Review Policy

This policy applies to PR reviews, closeout passes, and agent self-review before asking a human to trust a change. Treat it as additive to the architecture boundaries and safety rails above.

- **Read before verdicts**: before saying a change is good, bad, complete, best-fix, or proof-sufficient, search and read the relevant code path. Include owners, entry points, callers, callees, sibling surfaces sharing the same invariant, scoped docs, dependency contracts, and existing tests.
- **Build an evidence map**: every non-trivial closeout should be able to cite the changed surface, runtime entry point, owner boundary, at least one caller and callee, sibling surfaces checked, tests or scenarios that cover the behavior, and the current main/shipped behavior. Use repo-root relative paths and line numbers.
- **Ask the best-fix question**: every PR review or closeout must explicitly ask whether the patch is the best fix for the problem, not merely a plausible local fix. Prefer narrow changes that preserve local-first boundaries and deterministic ingest behavior.
- **Require real behavior proof**: for user-visible behavior and all ingest/extraction changes, CI or mocked tests are not enough. Cite a real fixture roundtrip, dogfood run, UI journey, CLI run, or equivalent proof with exact observed values.
- **Run the closeout loop before landing**: every non-trivial or non-docs change needs a fresh `.agents/skills/autoreview` loop until there are no accepted/actionable findings. Treat the harness output as advisory and verify accepted findings against real paths before fixing.
- **Use scenarios as living contracts**: once `qa/scenarios/` exists (Phase 5), changes must update or cite the relevant scenarios, especially for ingest edge cases.
- **Define shipped precisely**: "shipped" means reachable from a release tag or the documented release artifact, not merely merged, demoed, or passing locally.

### Ingest and Extraction Proof

All changes touching `packages/tasks/src/extract/**`, `packages/pdf-extractor/**`, `packages/e2e-tests/fixtures/imap/**`, or `qa/scenarios/ingest/**` require explicit sibling analysis across the full deterministic pipeline: `pipeline.ts`, `body-fallback.ts`, `swiggy-body-signals.ts`, `merchants/*`, pdf-extractor schema/parity code, goldens, fixture expectations, and provenance handling.

The proof note must cite a real fixture roundtrip, dogfood run, or equivalent with exact values for the fields that matter, such as `schemaUsed`, `dataSource`, provenance, amounts, item names, order IDs, and warnings. If a full real-account dogfood run is maintainer-only, state the closest committed-fixture proof that was run and what remains manual.

## Agentic Workflows

The active adoption plan is `packages/docs/roadmap/agentic-coding-adoption.md`. It phases in policy, autoreview loops, real behavior proof, ingest `qa/scenarios/`, and orchestrated sweeps. Use the orchestrator for high-level handoffs, background/polling simulations, and broad ingest sweeps that should be split into landable units. Do not mark a phase shipped unless its verification and proof requirements are complete.
