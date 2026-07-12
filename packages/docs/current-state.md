# Current state — what exists today

> **Revision on 2026-04-26.** The entire hosted → local-first migration has shipped end-to-end (Foundation → local-feature-parity → onboarding/UX → testing pyramid → release → IMAP pivot). The five roadmap files that drove that work (the previous `roadmap/phase-1.md` … `phase-4.md` and `roadmap/pivot-imap.md`) were deleted on 2026-04-23; their surviving residue lives in the **"Retired phase docs"** section below as one-line summaries, with detail in git history. The active execution plan is [`roadmap/pdf-extractor.md`](./roadmap/pdf-extractor.md), an index that splits the Swiggy ingest pivot into a fresh set of phase files: [`phase-1.md`](./roadmap/phase-1.md) (deterministic Python extractor), [`phase-2.md`](./roadmap/phase-2.md) (remove AI from ingest), [`phase-3.md`](./roadmap/phase-3.md) (parallelize sync), [`phase-4.md`](./roadmap/phase-4.md) (fast onboarding + post-onboarding assistant setup), and [`phase-5.md`](./roadmap/phase-5.md) (fixtures, golden tests, dogfood, cleanup). These new phase files replace, not extend, the retired ones — Python extracts PDF/body facts deterministically, sync runs in parallel, and AI remains for the assistant experience.

> The historical notes further down describe the pre-pivot monorepo that the now-retired phases were written against. They are kept only to explain _why_ each retired phase existed. Treat any claim here that conflicts with `roadmap/pdf-extractor.md` as already out of date.

## Retired phase docs — one-line shipped summaries

The detail behind each entry lives in git history. For each deleted file, the PRs that closed its "Pending" checklist are reachable via `git log -- packages/docs/roadmap/<file>`.

- **`roadmap/phase-1.md` — Local-first feature parity.** Shipped: cron + single-flight mutex, PDF attachment storage and local `/api/attachments/<id>` route, Swiggy analytics rewrite on SQLite (typed Drizzle tools, no raw SQL from the assistant), skills registry v1 (bundled `gmail-swiggy`, `skills list/enable/disable`), packaging / release workflow scaffolding, expanded doctor surface, and evals-as-a-gate wiring. Real-account dogfood (running extraction without `SLASHCASH_SYNC_SKIP_AI=1` against live Gmail) is absorbed by the new active plan because the extractor itself is being rebuilt there.
- **`roadmap/phase-2.md` — Onboarding, progress, error UX.** Shipped: Phase 1/2 leak cleanup + architectural smell gate, `doctor --quick` / `--json` + standardised `error[<area>]: symptom / cause / fix / docs` block, skill-driven cron registry (mutex-keyed, `skills:changed` event), `slashcash privacy` command, `@clack/prompts` onboarding wizard, IMAP credential flow, and rewritten IMAP privacy copy. The one pending "cancel mid-`ollama pull` then `doctor --fix`" item is a manual dogfood chore, not a roadmap workstream; it is tracked as a maintainer runbook item under `reference/testing.md` § manual.
- **`roadmap/phase-3.md` — Full testing pyramid.** Shipped: shared Vitest infrastructure, per-package `vitest.config.ts` across `packages/cli`, `packages/tasks`, `packages/database`, `packages/ui`, `apps/main`, v8 coverage via `test:coverage`, `architecture-smells.test.ts` (forbidden-import / forbidden-directory / forbidden-DB / forbidden-env), `pnpm fixtures:check`, the `phase-4.ts` meta scenario, PR / nightly / release workflow scaffolding, `e2e:phase-1`..`e2e:phase-5` runners, customer-journey Playwright coverage (`dashboard.spec.ts`, `transactions.spec.ts`, `assistant-feedback.spec.ts`), and the IMAP boundary integration spec. The coverage-floor enforcement, remaining boundary integration specs, analytics snapshot pinning, `ts-morph`-based smells and `--help` ↔ `reference/cli.md` parity check, and GitHub branch protection items remain as backlog tasks tracked in `reference/testing.md`; they did not make the cut for v1 release and do not gate the PDF-extractor pivot.
- **`roadmap/phase-4.md` — Release, packaging, observability, docs polish.** Shipped: `.github/workflows/release.yml` (historically tag-triggered npm publish with provenance + SBOM + checksum + published-version smoke; end-user path superseded by ADR-028 desktop GitHub Releases), `packages/cli/scripts/bundle-app.mjs`, `bundle:check`, `bundle:pack-smoke`, `pnpm pack:local`, the `slashcash logs` reader, rotation-aware `LogEvent` writer, `packages/e2e-tests/bench/perf-budget.ts`, `eval:gate` wiring, and the `phase-5.ts` fixture scenario. Real product release dogfood is a clean-machine **Desktop app** install (ADR-028) + real eval threshold + hosted-surface decommission, gated on the PDF-extractor pivot and desktop packaging work.
- **`roadmap/pivot-imap.md` — IMAP + app password + interactive wizard.** Shipped: stages P0–P5 (gws/gcloud removal, IMAP client + credentials store, `@clack/prompts` wizard, privacy-copy rewrite, reference-doc parity, fixture-backed E2E). Stage P6 (clean-machine install + real Gmail dogfood) is the same real-account exercise listed for phase-4 above, now framed as Desktop app launch + Desktop onboarding (ADR-028); both become a single v1-release dogfood once the PDF-extractor pivot and desktop pack land.

The process lesson from the deleted Phase 1/2 boundary audit — every phase ends with re-running previous E2Es + architecture-smells + `--help` ↔ `reference/cli.md` parity + migrating the previous phase's gaps into the next phase's Pending list — is codified in **ADR-017** and is still the merge-gate convention for the active plan.

Snapshot of the monorepo before the hosted-era pivot started. This was the input to the retired Phase 1 and to the file-change list in `reference/file-changes.md`. All paths are repo-root relative.

## Monorepo shape

There are two apps: `apps/main` (the Next.js dashboard with Supabase auth, Drizzle over Postgres, tRPC, AI SDK and Trigger.dev wiring) and `apps/website` (the marketing site). There are seven packages: `database` (Drizzle schema and queries), `tasks` (Trigger.dev v3 jobs for Gmail polling and AI extraction), `ui` (shadcn components), `e2e-tests` (Playwright), `evals` (Braintrust + OpenAI), `eslint-config` and `typescript-config`. Tooling is pnpm workspaces with Turborepo.

There is no CLI package and no docs package today.

## What lives in `apps/main`

Under `app/` the route groups split into `(auth)` (login, register, auth layout), `(authenticated)` (dashboard, transactions, assistant, settings, feedback), a tRPC HTTP handler at `api/trpc/[trpc]`, an AI SDK streaming route at `api/assistant`, and a Supabase OAuth callback at `auth/callback`. Next.js middleware in `middleware.ts` delegates to `supabase/middleware.ts`, which refreshes the Supabase session on almost every request and redirects unauthenticated visitors to `/login`. The tRPC context in `trpc/init.ts` assumes Supabase is the source of truth for `userId`. There is a Supabase Storage-backed PDF viewer component under `components/transactions/transaction-pdf-viewer.tsx`. The `lib/ai/tools/` folder contains raw-SQL generation and execution tools whose prompts are written in Postgres JSONB flavour.

## What lives in the shared packages

`packages/database` holds Drizzle schemas (`schema/*`), Postgres-only queries (`queries/*`) and migrations under `drizzle/`. The driver is `postgres` and the dialect is `postgresql`. The heaviest single file is `queries/insights/swiggyAnalytics.ts`, which leans on PostgreSQL-specific operators (JSONB extraction, array functions, containment, `EXTRACT`, `DATE_TRUNC`, numeric casts).

`packages/tasks` contains four Trigger.dev units: `processEmails` (coordinator), `processEmailBatch` (per-batch), `detectDuplicateTransactionsForUser` (dedupe) and a nightly scheduled task. Supporting modules talk to Gmail's REST API, refresh Google tokens, write PDFs to a Supabase Storage bucket named `email-attachments`, and run OpenAI or Mistral models for PDF parsing.

`packages/ui`, `packages/e2e-tests`, `packages/evals`, `packages/eslint-config`, `packages/typescript-config` are conventional. E2E tests assume Supabase auth.

## Database tables today

There are ten tables, backed by Postgres: `auth.users` (a placeholder pointing at Supabase's auth schema), `profiles`, `parsed_emails`, `email_sync_status`, `transactions_v2`, `user_google_tokens`, `token_access_logs`, `feedback`, `chats`, `chat_messages`. Three of them (`auth.users`, `user_google_tokens`, `token_access_logs`) are there specifically because auth and Google tokens live in the DB today; they have no place in the local-first design.

## Cloud couplings we will remove

This is the definitive list of what is wired to a remote service today and has to be either replaced or deleted outright.

- **Supabase Auth** (SSR cookies, session refresh, middleware redirect). Affects `apps/main/middleware.ts`, `apps/main/supabase/*.ts`, `apps/main/trpc/init.ts`, the `(authenticated)` layout, `app/api/assistant/route.ts`, `components/nav-user.tsx`, `hooks/useEmailSync.ts`, everything under `components/auth/`, and the OAuth callback route.
- **Supabase Postgres**. Affects `packages/database/src/index.ts`, `drizzle.config.ts`, every schema file (all `pg-core` types), all migrations, and every query file that uses `ilike` or Postgres-only SQL fragments. The biggest rewrite inside this bucket is `queries/insights/swiggyAnalytics.ts`.
- **Supabase Storage** (the `email-attachments` bucket and signed URLs). Affects `packages/tasks/src/utils/emailStorage.ts`, `utils/signedUrls.ts`, and the PDF viewer component.
- **Trigger.dev** (`configure`, `task`, `schedules`, `batch`, `wait`). Affects every file under `packages/tasks/src/trigger/`, `packages/tasks/trigger.config.ts`, `apps/main/trpc/routers/emails.ts`, the package's scripts, and the `release-prod-trigger` GitHub workflow.
- **Google OAuth owned by us** (client id/secret, refresh tokens stored in DB). Affects `packages/tasks/src/utils/googleAuth.ts`, `utils/gmailApi.ts`, the `user_google_tokens` and `token_access_logs` tables, the OAuth callback route, and the "connect Gmail" UI in `hooks/useEmailSync.ts` and `components/sync/*`.
- **Remote AI SDK providers** (`@ai-sdk/openai`, `@ai-sdk/mistral`, `@ai-sdk/anthropic`). Affects `apps/main/app/api/assistant/route.ts`, `packages/tasks/src/ai/model.ts`, `packages/tasks/src/agents/slashAIV2.ts`, and `packages/evals/*`.
- **Vercel surface** (`@vercel/analytics`, `VERCEL_URL`, `NEXT_PUBLIC_VERCEL_URL`). Affects `apps/main/app/layout.tsx`, `apps/main/trpc/client.tsx`, `apps/main/lib/oauth.ts`.
- **Route-level dead surface** (login, register, OAuth callback, beta-access procedure). Affects `app/(auth)/*`, `app/auth/callback/route.ts`, `components/auth/*`, the `feedback.requestBetaAccess` procedure.

## The tRPC surface

Five routers. `chat` (chat CRUD), `transactions` (list/filter/enums), `analytics` (Swiggy overview / behavior / insights / dashboard), `emails` (sync state machine + kick triggers), `feedback` (in-app feedback + public beta-request). All routers assume an authenticated `userId` comes from Supabase through `trpc/init.ts`. Every procedure except `feedback.requestBetaAccess` survives the pivot at the API-surface level; the insides change.

## Background jobs today

Four Trigger.dev units coordinate Gmail ingest end-to-end: a parent `processEmails` task does query construction, token refresh, pagination and batch fan-out; `processEmailBatch` fetches messages, runs AI extraction, writes the DB, uploads PDF attachments to Supabase Storage, and triggers dedupe; `detectDuplicateTransactionsForUser` runs the Fellegi–Sunter-style matching in the database package; a nightly scheduled task sweeps users who need syncing. All four are triggered by Trigger.dev today; in the local design, the parent becomes a plain async function called by a `node-cron` schedule and by a "sync now" tRPC procedure.

## Postgres-specific things that do not port trivially

Three files contain the majority of the porting cost: `packages/database/src/queries/insights/swiggyAnalytics.ts` (JSONB extraction, array functions, `EXTRACT(DOW FROM ...)`, `DATE_TRUNC('month', ...)`, numeric casts); `packages/database/src/queries/transactions.ts` (a handful of `ilike` / `ILIKE` uses); `packages/database/src/queries/operations/emailSync.ts` (small `LEAST` / `ROUND(... ::numeric)` fragments). Separately, the raw-SQL agent tools at `apps/main/lib/ai/tools/generate-sql.ts` and `execute-sql.ts` encode Postgres JSONB assumptions directly into their prompts — in the local design these are replaced with typed Drizzle-backed tools rather than re-prompted for SQLite.

## Environment variables today

Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), Trigger (`TRIGGER_SECRET_KEY`), Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), OpenAI and eval keys (`OPENAI_API_KEY`, `BRAINTRUST_API_KEY`, `MODEL_NAME`), Postgres (`DATABASE_URL`), Vercel (`VERCEL_URL`, `NEXT_PUBLIC_VERCEL_URL`, `NEXT_PUBLIC_SITE_URL`). All of these go away in the local design and are replaced by a small set of local-only variables (the DB path, the Ollama base URL, the port) with sensible defaults. The full matrix lives in `reference/env-vars.md`.

## What's already in our favour

The dashboard, assistant UI and transaction list are read-side code. Once SQLite is wired and tRPC has a static `userId`, most of `app/(authenticated)/*` keeps working without changes. The AI SDK is already abstracted behind `streamText` and `generateText`, so swapping providers is mechanical. Most Drizzle queries are dialect-agnostic at the call-site level; only the Swiggy analytics body is Postgres-heavy.

## What's working against us

The Swiggy analytics rewrite is the biggest single piece of work in Phase 2. The raw-SQL agent tools encourage a JSONB-flavoured contract that has to be replaced, not ported. Supabase Storage is embedded in the PDF viewer's URL contract and the ingest pipeline. Trigger.dev does more than scheduling — it does fan-out and waits — so the local replacement needs an in-process queue discipline rather than "just a cron". E2E tests assume Supabase auth.
