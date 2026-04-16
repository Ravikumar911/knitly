# Reference — File change list

Concrete per-file changes for Phase 1. This is the checklist the execution chat works against. Paths are repo-root relative. Every line is categorised as **create**, **modify**, or **delete**.

## Root and tooling

- **modify** `package.json` — remove `@supabase/ssr`, `@supabase/supabase-js`, `@trigger.dev/sdk`, `@trigger.dev/build`, `@vercel/analytics`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/mistral`, `postgres`. Add `better-sqlite3`, `@ai-sdk/openai-compatible`, `commander`, `picocolors`, `prompts`, `node-cron`, `zod` (if not already hoisted). Keep `drizzle-orm`, `drizzle-kit`, `ai`, `@ai-sdk/react`, `@trpc/*`, `tailwindcss-animate`, shadcn deps, Next and React deps.
- **modify** `turbo.json` — remove cloud env vars from every pipeline's `env` list; add `SLASHCASH_HOME`, `SQLITE_DB_PATH`, `OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL`.
- **modify** `.env.example` — replace hosted variables with the small set listed in `reference/env-vars.md`.
- **modify** `README.md` — repoint the Getting Started section at the CLI. Remove Supabase/Trigger/OpenAI setup instructions.
- **delete** `render.yaml` and any other hosted-deployment config at the root.
- **modify** `pnpm-workspace.yaml` — unchanged in shape (`packages/*` already captures the new `cli` and `docs` packages).
- **delete** `.github/workflows/release-prod-trigger.yml` and any workflow that deploys the hosted app, sets Supabase env, or uses Trigger secrets.

## New package: `packages/cli/`

- **create** `packages/cli/package.json` — exposes the `slashcash` bin, lists CLI-only deps.
- **create** `packages/cli/tsconfig.json` — extends `@workspace/typescript-config`.
- **create** `packages/cli/tsup.config.ts` — bundles the compiled entry.
- **create** `packages/cli/bin/slashcash.mjs` — Node-version check, dynamic import of compiled entry. The openclaw shim pattern, applied minimally.
- **create** `packages/cli/src/entry.ts` — `--version` fast path, then lazy import of the command runner.
- **create** `packages/cli/src/cli/run.ts` — Commander program builder that registers commands via the catalog.
- **create** `packages/cli/src/cli/command-catalog.ts` — maps command ids to lazy module loaders.
- **create** `packages/cli/src/cli/registry/start.ts` — boot the Next.js server and the cron worker.
- **create** `packages/cli/src/cli/registry/stop.ts` — kill by PID.
- **create** `packages/cli/src/cli/registry/status.ts` — print the status table.
- **create** `packages/cli/src/cli/registry/doctor.ts` — run checks and optionally repairs.
- **create** `packages/cli/src/cli/registry/config.ts` — `get|set|path`.
- **create** `packages/cli/src/cli/registry/db.ts` — `seed|reset`.
- **create** `packages/cli/src/cli/registry/onboard.ts` — Phase 1 stub that prints "coming in Phase 2".
- **create** `packages/cli/src/cli/registry/sync.ts` — Phase 1 stub.
- **create** `packages/cli/src/cli/registry/skills.ts` — Phase 1 stub.
- **create** `packages/cli/src/cli/registry/logs.ts` — Phase 1 stub.
- **create** `packages/cli/src/config/paths.ts` — resolves `SLASHCASH_HOME`, child paths.
- **create** `packages/cli/src/config/schema.ts` — the config schema.
- **create** `packages/cli/src/config/load.ts` — read, validate, write-back helpers.
- **create** `packages/cli/src/runtime/pid.ts` — PID file helpers.
- **create** `packages/cli/src/runtime/log.ts` — structured logging.
- **create** `packages/cli/src/runtime/result.ts` — `Result` helpers for closed-code error returns.
- **create** `packages/cli/src/start/boot.ts` — spawn Next.js, wait for healthz, wire SIGINT.
- **create** `packages/cli/src/start/cron.ts` — node-cron schedule registration; Phase 1 registers none.
- **create** `packages/cli/src/doctor/checks.ts` — the list of checks.
- **create** `packages/cli/src/doctor/run.ts` — check orchestration.
- **create** `packages/cli/src/doctor/repairs.ts` — per-check repair functions.
- **create** `packages/cli/README.md` — user-facing intro.

## New package: `packages/docs/`

- Already created. No further changes in Phase 1 beyond keeping the content current as the work lands.
- **create** `packages/docs/reference/testing.md` — the end-to-end gate definition for each phase. Present from day one; updated as the harness lands.

## `packages/database/`

- **modify** `packages/database/src/index.ts` — switch driver to `better-sqlite3` and dialect to `drizzle-orm/better-sqlite3`. Read DB path from `SQLITE_DB_PATH` with the documented fallback.
- **delete** `packages/database/drizzle.config.ts` (if Postgres-specific) and **create** its SQLite replacement that targets `better-sqlite3`.
- **delete** `packages/database/drizzle/` (the Postgres migration set is no longer relevant).
- **create** `packages/database/drizzle/` (regenerated) with the first SQLite migration.
- **delete** every file under `packages/database/src/schema/` that uses `pg-core` and **create** its `sqlite-core` replacement. Specifically: `users.ts` (now without `pgSchema('auth')`; drop entirely if the UI does not need it), `profiles.ts`, `parsedEmails.ts`, `transactionsV2.ts`, `emailSyncStatus.ts`, `chats.ts`, `chatMessages.ts`, `feedback.ts`.
- **delete** `packages/database/src/schema/tokens.ts` — gws owns auth.
- **modify** `packages/database/src/schema/index.ts` — re-exports after the rewrite.
- **modify** `packages/database/src/queries/transactions.ts` — replace `ilike` calls with lowered-`like`.
- **modify** `packages/database/src/queries/operations/emailSync.ts` — replace `LEAST`/`ROUND(... ::numeric)` fragments with SQLite equivalents.
- **keep** `packages/database/src/queries/insights/swiggyAnalytics.ts` as-is for now but add a small gate around the exports so it is not imported in Phase 1. The actual SQLite rewrite lands in Phase 2 W5.
- **create** `packages/database/src/seed/local.ts` — deterministic Swiggy fixtures.

## `apps/main/`

- **delete** `apps/main/supabase/` — entire folder.
- **delete** `apps/main/middleware.ts` — middleware goes away (or is reduced to the minimum if something else needs it, but Phase 1 does not).
- **delete** `apps/main/app/(auth)/` — entire route group.
- **delete** `apps/main/app/auth/` — the OAuth callback route and anything else in that tree.
- **delete** `apps/main/components/auth/` — entire folder.
- **delete** `apps/main/lib/oauth.ts` — the OAuth helper.
- **modify** `apps/main/trpc/init.ts` — remove Supabase client, set a static `userId`.
- **modify** `apps/main/trpc/routers/emails.ts` — drop Trigger calls. In Phase 1 the mutations return a receipt that records the request; in Phase 2 W2 they call the in-process ingest.
- **modify** `apps/main/trpc/routers/feedback.ts` — drop `requestBetaAccess`.
- **modify** `apps/main/trpc/routers/analytics.ts` — in Phase 1 return seed-derived fixtures; in Phase 2 W5 call the rewritten analytics.
- **modify** `apps/main/trpc/client.tsx` — use a direct `127.0.0.1:<port>` base URL instead of `VERCEL_URL`-derived logic.
- **modify** `apps/main/app/layout.tsx` — remove `@vercel/analytics` import and mount.
- **modify** `apps/main/app/(authenticated)/layout.tsx` — remove the `auth.getUser()` guard. The `(authenticated)` folder can be renamed or flattened to the app root at the end of Phase 1.
- **modify** `apps/main/app/(authenticated)/assistant/page.tsx` and `[chatId]/page.tsx` — remove Supabase user lookups.
- **modify** `apps/main/app/api/assistant/route.ts` — remove auth check; import the chat model from the new provider module.
- **create** `apps/main/app/api/healthz/route.ts` — simple status payload.
- **create** `apps/main/lib/ai/provider.ts` — the single AI provider module for the assistant and the tasks package.
- **delete** `apps/main/lib/ai/tools/generate-sql.ts` — Phase 1 makes this unreachable; Phase 2 W5 deletes it and adds typed tools in its place.
- **delete** `apps/main/lib/ai/tools/execute-sql.ts` — same.
- **modify** `apps/main/lib/ai/tools/format-response.ts` — rewire to the new tool shape (Phase 2 W5).
- **modify** `apps/main/hooks/useEmailSync.ts` — remove OAuth and Supabase paths; show a simpler "last synced" state.
- **modify** `apps/main/components/nav-user.tsx` — remove the sign-out button; show a static local user name (or nothing).
- **modify** `apps/main/components/transactions/transaction-pdf-viewer.tsx` — replace Supabase Storage signed URLs with a fetch from `/api/attachments/<id>` in Phase 2 W4.
- **modify** `apps/main/next.config.mjs` — in Phase 2 W8 add the `output: 'standalone'` setting used by the release build.

## `packages/tasks/`

Phase 1 makes this package compile against the new dependency set (no Trigger, no Supabase, no OpenAI/Mistral) by deleting or gutting the cloud-coupled modules. The full rewrite into a local job library lands in Phase 2 W2.

- **delete** `packages/tasks/trigger.config.ts`.
- **delete** `packages/tasks/src/utils/supabase.ts`.
- **delete** `packages/tasks/src/utils/signedUrls.ts` — will be replaced by `attachments-fs.ts` in Phase 2 W4.
- **modify** `packages/tasks/src/utils/emailStorage.ts` — stub or delete in Phase 1, replace with filesystem-based helper in Phase 2 W4.
- **modify** `packages/tasks/src/utils/gmailApi.ts` — delete in Phase 2 W2. Phase 1 can leave it behind a build exclusion if that's easier.
- **modify** `packages/tasks/src/utils/googleAuth.ts` — same.
- **modify** `packages/tasks/src/agents/slashAIV2.ts` — point at the new provider module; Phase 2 W6 rewrites the PDF/vision flow.
- **modify** `packages/tasks/src/ai/model.ts` — consume the new provider module.
- **modify** `packages/tasks/src/trigger/processEmails.ts` — rewritten in Phase 2 W2 as a plain async function. Phase 1 leaves it disabled.
- **modify** `packages/tasks/src/trigger/processEmailBatch.ts` — same.
- **modify** `packages/tasks/src/trigger/duplicateDetector.ts` — rewritten as a plain function in Phase 2 W2.
- **delete** `packages/tasks/src/trigger/nightlyEmailSync.ts` — cron is registered at CLI start, not as a Trigger schedule.
- **create** `packages/tasks/src/runtime/mutex.ts` — the single-flight mutex (Phase 2 W3).
- **create** `packages/tasks/src/runtime/jobRegistry.ts` — the job registry consumed by skills (Phase 2 W3/W7).

## `packages/e2e-tests/`

This package is repurposed as the host of the phase-level end-to-end harness defined in `reference/testing.md`. It is no longer a generic Playwright suite against the hosted app.

- **modify** every auth-dependent test to assume no login. The test runner targets the local CLI flow: spawn `slashcash start` pointed at a temp `SLASHCASH_HOME`, run Playwright (or a lighter HTTP-based harness, chosen during Phase 1 W7) against `http://127.0.0.1:<port>`.
- **delete** Supabase setup fixtures and test users.
- **create** `packages/e2e-tests/scenarios/phase-1.ts` — the Phase 1 E2E scenario (clean-state install, doctor, seed, start, healthz, assistant stream, status, stop).
- **create** `packages/e2e-tests/scenarios/phase-2.ts` — the Phase 2 E2E scenario (npm install, onboard, sync against a test Google account, attachments, assistant answer, skill disable, stop, re-run onboard). Lands in Phase 2; stubbed in Phase 1.
- **create** `packages/e2e-tests/support/` — helpers shared by both scenarios (temp `SLASHCASH_HOME`, spawning `slashcash`, waiting on healthz, asserting on SQLite rows and filesystem state).
- **modify** `packages/e2e-tests/package.json` — expose `e2e:phase-1` and `e2e:phase-2` scripts, wired into the root `package.json`.

## `packages/evals/`

- **modify** `packages/evals/src/swiggy-extraction.eval.ts` — use the local provider module.
- **delete** any eval dataset or harness that requires remote-only providers or Braintrust keys in Phase 1. Revisit in Phase 2 W10.
- **modify** eval scripts in `package.json` to not require `BRAINTRUST_API_KEY`.

## `apps/website/`

No changes in Phase 1. Marketing site stays as-is; its landing page is updated at the end of Phase 2 when the CLI is ready to be the recommended path.

## CI workflows

- **delete** every workflow that deploys, tests, or references the hosted app's Supabase / Trigger / Vercel surface.
- **modify** the remaining build / lint / typecheck workflows so they run against the new dependency set. Add a smoke workflow that builds the CLI tarball and starts `slashcash start` in headless mode to confirm the dashboard responds on healthz.
- **create** `.github/workflows/e2e-phase-1.yml` — macOS runner, installs Ollama and pulls `gemma3n:e4b`, runs `pnpm e2e:phase-1`. Required for Phase 1 exit.
- **create** `.github/workflows/e2e-phase-2.yml` — macOS runner, clean state, mounts the `gws` credentials secret for the test Google account, runs `pnpm e2e:phase-2`. Required for Phase 2 exit.

## Final grep checklist (Phase 1 exit gate)

After Phase 1 lands, the following greps across the shipping code (i.e. everything except `packages/docs/`, `CHANGELOG_SETUP.md`, and archived marketing docs) should return zero hits: `@supabase/`, `@trigger.dev/`, `@vercel/analytics`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/mistral`, `postgres`, `pgSchema`, `jsonb`, `ilike`, `doublePrecision`, `gen_random_uuid`, `SUPABASE_SERVICE_ROLE_KEY`, `TRIGGER_SECRET_KEY`, `GOOGLE_CLIENT_SECRET`, `VERCEL_URL`, `SLASHCASH_MODE`.
