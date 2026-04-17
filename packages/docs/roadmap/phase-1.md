# Phase 1 — Foundation

> *Goal: a developer can run one command from this monorepo and see the existing dashboard at `http://127.0.0.1:<port>` reading from a local SQLite file, with Supabase, Trigger.dev and the remote AI providers fully removed. Gmail ingest is not wired yet (seed data stands in); that belongs to Phase 2.*

Phase 1 is the load-bearing phase. Most of the real removal and rewiring happens here. Phase 2 is mostly new local features built on top of this foundation.

**Standing conventions for this phase.** Take learnings from the sibling repo at `../openclaw` continuously. Every workstream below has a proven counterpart there — entry shim and respawn pattern for the CLI, command catalog for lazy loading, doctor repair sequencing, state-directory layout, schema validation at every external boundary, closed `Result`-style returns. When you're unsure how a piece should feel, open the openclaw file that does the same thing and adopt the **pattern**. Don't copy code. The phase is not done until the end-to-end scenario defined in [`../reference/testing.md`](../reference/testing.md) passes from a clean machine; see "End-to-end verification" below.

## Success criteria

1. One developer command starts the dashboard locally on loopback. There is no `SLASHCASH_MODE` or cloud fallback anywhere in the codebase.
2. The existing `(authenticated)` dashboard, transactions, assistant and settings pages render without any auth wall.
3. Transactions, chats and analytics are read from `~/.slashcash/db.sqlite` through the existing tRPC routers.
4. The chat assistant streams a reply from `gemma3n:e4b` running on the developer's local Ollama.
5. Nothing in the shipping code imports from `@supabase/*`, `@trigger.dev/*`, `@vercel/analytics`, `@ai-sdk/openai`, `@ai-sdk/anthropic` or `@ai-sdk/mistral`. A repo-wide search confirms this as an exit gate.
6. `slashcash doctor` runs and reports green for Node version, config directory, SQLite file and Ollama reachability.
7. `packages/docs` stays accurate as the plan evolves.

A demo at end of phase: from a clean clone, one terminal session ends with a working local dashboard populated by seed data, and nothing on disk or in the repo refers to a cloud service.

## Workstreams overview

Seven workstreams, sequenced roughly serially with some parallelism where the dependencies allow it. Approximate sizing is S (≤1 day), M (2–4 days), L (about a week).

1. **W1 — Remove the cloud surface (M).** Delete every file, route, package dependency, env var, CI step and GitHub workflow that exists only to serve the hosted app. This is physical removal, not feature-flagging.
2. **W2 — `packages/cli` skeleton (M).** Create the CLI workspace with `slashcash --version`, `--help`, `config`, `doctor`, `status`, `stop`, and a working `start`. Lazy-load subcommand modules. Mirror the openclaw entry-shim pattern for a fast cold path.
3. **W3 — SQLite swap in `packages/database` (L).** Replace the Postgres dialect with SQLite (better-sqlite3), port every schema file to `sqlite-core`, rewrite the small set of Postgres-only query fragments outside of Swiggy analytics, and generate the first SQLite migration. Swiggy analytics itself is deferred to Phase 2.
4. **W4 — Local user and tRPC context (S).** Strip Supabase from `apps/main`: delete the `supabase/` folder, the OAuth callback, the auth route group and the auth components; make the tRPC context return a static local user id; turn `middleware.ts` into a no-op that we then remove entirely once nothing depends on it.
5. **W5 — AI provider swap (S).** Point both the assistant route and the tasks package at a single local provider module that targets the Ollama OpenAI-compatible endpoint with `gemma3n:e4b`. Remove the remote AI SDK dependencies.
6. **W6 — Seed data (S).** Provide a `slashcash db seed` path that fills SQLite with realistic Swiggy fixtures, so the dashboard is usable in Phase 1 without Gmail ingest.
7. **W7 — `slashcash start` end-to-end (M).** Wire `start` to spawn the Next.js dev server pinned to `127.0.0.1`, register a placeholder cron worker (no jobs yet), write a PID file, expose `/api/healthz`, open the browser, and shut down cleanly on SIGINT.

## W1 — Remove the cloud surface

The purpose of this workstream is that by the end of Phase 1 there is no cloud code in the repo. This is a deletion workstream, not a gating one.

What to remove. Everything in `apps/main/supabase/` disappears along with the Next.js middleware and its delegation. The `app/(auth)` route group, the `app/auth/callback/route.ts` OAuth callback, and the `components/auth/` tree are deleted. The `feedback.requestBetaAccess` tRPC procedure is removed. The `@supabase/ssr`, `@supabase/supabase-js`, `@trigger.dev/sdk`, `@trigger.dev/build`, `@vercel/analytics`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/mistral` and `postgres` dependencies are removed from every `package.json` in the workspace (the AI SDK ones are replaced inside W5 with an OpenAI-compatible provider; `postgres` is replaced by `better-sqlite3` inside W3). The `packages/tasks/trigger.config.ts` is deleted. The `release-prod-trigger` GitHub workflow is deleted along with any other CI job that talks to a remote service. The deployment-related files for the hosted app — `render.yaml`, Vercel-specific config, deployment docs — are removed or archived.

Env variable cleanup. The root `.env.example`, `apps/main/.env.example`, `packages/tasks/.env.example` and related files are rewritten to list only the local-safe variables (the DB path, the Ollama base URL, the port) with their defaults. Supabase, Trigger, Google OAuth, OpenAI, Mistral, Anthropic, Vercel and Braintrust keys are removed from the `turbo.json` env passlists.

What stays. `apps/website` stays as a marketing site; its deployment path can continue as-is since it's a static Next.js app and doesn't touch Supabase. `packages/evals` stays but is refactored in W5 to use the local provider; if it can't work without remote keys at the end of Phase 1, it's moved behind a `pnpm --filter evals run` path that a user never needs.

Acceptance is a grep: after this workstream, searches for each removed package name, for `SLASHCASH_MODE`, and for `supabase.` or `trigger.` inside application code all return zero hits in the shipping code.

## W2 — `packages/cli` skeleton

A new workspace package at `packages/cli` exposes the `slashcash` bin. The package has a tiny entry shim at `bin/slashcash.mjs` that only checks the Node version and imports the compiled entry dynamically, and a compiled entry that fast-paths `--version` before lazily importing the command runner. Commands are registered through a small catalog module that maps each command id to a dynamic `import()` so only the requested command's code is loaded on a given invocation.

Phase 1 command scope. Implement `version`, `help`, `config` (get / set / path), `doctor` (with `--fix` for the small set of Phase 1 checks), `status`, `stop`, and `start` (real implementation in W7). `onboard`, `sync`, `skills`, and `logs` are stubs that print a clear "coming in Phase 2" message and exit.

Runtime building blocks the other workstreams depend on: a paths module that resolves `~/.slashcash/` and its subpaths, a config module that reads and validates `config.json` against a schema and writes it back safely, a PID module that reads/writes/clears the PID file, a logging module that writes structured JSON lines into `~/.slashcash/logs/`, and a `Result` helper for closed-error-code returns from subprocess wrappers.

Conventions borrowed from openclaw. No mixing of static and dynamic imports of the same module in production code paths. Schemas at every external boundary. No `any`. Files under about seven hundred lines as a guideline. Errors expressed as discriminated unions or closed code unions, not ad-hoc strings.

Acceptance is that `slashcash --version` runs in well under a hundred milliseconds cold, `slashcash --help` lists every command (stubs included), `slashcash config path` prints the right file under `~/.slashcash/`, and `slashcash doctor` runs without throwing.

## W3 — SQLite swap in `packages/database`

The dialect changes from Postgres to SQLite. Drizzle is retained. The driver becomes `better-sqlite3`. A new schema folder at `packages/database/src/schema/` (replacing the existing one; this is a destructive rewrite since we no longer dual-dialect) expresses each table in `sqlite-core`. UUID primary keys become `text` with application-side generation; serial ids become auto-increment integers; timestamps become millisecond integers; JSONB columns become JSON-mode text columns; decimals are represented as the agreed type from ADR-010 in `reference/decisions.md`. Any reference to the `auth` Postgres schema is removed. The `user_google_tokens`, `token_access_logs` and placeholder `auth.users` tables are deleted; `profiles` is either removed entirely or reduced to a single local row depending on what the UI expects (decide during kickoff).

The query layer edits are narrow. `queries/transactions.ts` replaces `ilike(col, pattern)` with a lowered-`like` equivalent. `queries/operations/emailSync.ts` replaces its small `LEAST` / `ROUND(... ::numeric)` fragments with SQLite equivalents. The heavy analytics module at `queries/insights/swiggyAnalytics.ts` is deferred: in Phase 1 the `analytics.*` tRPC procedures return seed-derived fixtures rather than calling the analytics functions. This keeps Phase 1's scope contained.

Migration tooling is regenerated for SQLite. Drizzle-kit produces the first migration against the new schema. The CLI's `doctor --fix` runs pending migrations against `~/.slashcash/db.sqlite`; `start` does the same at boot only if `doctor` has passed. This is the one place we allow automatic changes to the user's DB, and it is gated on a clean doctor pass.

Acceptance is a clean DB file with all expected tables after a `slashcash db reset`, every non-analytics tRPC procedure returning SQLite rows, and no references to the `postgres` driver, `pg-core`, `pgSchema`, `jsonb`, `ilike`, `doublePrecision`, `uuid` or `serial` anywhere in `packages/database/src/`.

## W4 — Local user and tRPC context

The goal is a Next.js app with no concept of authentication. The `apps/main/supabase/` folder is deleted. `apps/main/middleware.ts` is either deleted (if nothing else needs middleware in Phase 1) or reduced to the minimal middleware we want. The `app/(auth)` route group, the `app/auth/callback/route.ts` route, and the `components/auth/` tree are deleted. The `(authenticated)` route group is flattened — there's no authenticated-vs-anonymous distinction anymore — so its layout becomes the app's top-level layout; the folder can be renamed accordingly at the end of the workstream to avoid vestigial names.

The tRPC context at `apps/main/trpc/init.ts` returns a static `userId` (call it `"local"`) without consulting any auth provider. Every `protectedProcedure` either loses its distinction entirely or keeps its name for API symmetry while sharing the same context as `baseProcedure`. Anything that called `auth.getUser()` or `auth.signOut()` or `auth.signInWithOAuth()` is removed at the call site; the `nav-user.tsx` component loses its sign-out button or shows a static local user name.

Small env cleanup follows: `VERCEL_URL` / `NEXT_PUBLIC_VERCEL_URL` usage in `apps/main/trpc/client.tsx` and `apps/main/lib/oauth.ts` is replaced with a direct local base URL derived from the running port, and `apps/main/lib/oauth.ts` is deleted outright (no OAuth).

Acceptance is that `/dashboard` (or whatever the new top-level path becomes) renders without a login wall, the tRPC context returns `userId: "local"` in every call, and a grep for `@supabase/` inside `apps/main/` returns zero hits.

## W5 — AI provider swap

A single provider module under `apps/main/lib/ai/` becomes the source of truth for which model the app talks to. It targets the OpenAI-compatible endpoint exposed by Ollama, pinned by default to `gemma3n:e4b`. The base URL and model id are read from the loaded config, with documented defaults. The assistant route at `app/api/assistant/route.ts` imports the chat model from this module. The tasks package's model factory at `packages/tasks/src/ai/model.ts` does the same. The existing `slashAIV2.ts` agent, which currently picks between OpenAI and Mistral for PDF OCR, is gutted in Phase 1 to the extent needed to compile; the full vision rewrite belongs to Phase 2 W6.

Dependency changes. `@ai-sdk/openai-compatible` is added. `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/mistral` are removed from every workspace `package.json`. `packages/evals` is rewired to the same local provider so that evals can run offline; if the eval harness can't work without remote keys for some of its datasets, those datasets are removed from Phase 1's eval run and revisited in Phase 2 W10.

Acceptance is that the assistant streams a reply from the local `gemma3n:e4b` on a developer box, and that a grep for the removed AI SDK package names returns zero hits.

## W6 — Seed data

A seeding script inside `packages/database` populates `~/.slashcash/db.sqlite` with a realistic set of Swiggy transactions spread over several months, a handful of chat threads, and whatever supporting rows the analytics fixtures need. The seed is deterministic from a fixed seed value, so developers see identical dashboards.

The CLI exposes this as `slashcash db seed` and `slashcash db reset`. Reset deletes the SQLite file and attachments directory, runs migrations from scratch, and applies the seed. This is the developer's primary escape hatch in Phase 1.

Acceptance is that a fresh checkout, after `slashcash db reset`, shows a populated dashboard.

## W7 — `slashcash start` end-to-end

`start` loads and validates config, ensures `~/.slashcash/db.sqlite` exists and is migrated, writes a PID file, spawns the Next.js dev server with the hostname pinned to `127.0.0.1` and the port from config, registers an empty `node-cron` schedule (no jobs in Phase 1), probes `/api/healthz` until the server answers, and opens the browser. A SIGINT handler shuts the Next.js child, unregisters the cron, clears the PID file, and exits.

A new `app/api/healthz/route.ts` reports a minimal JSON body: ok, version and mode-of-running. `stop` reads the PID file, sends SIGTERM, waits up to a few seconds, falls back to SIGKILL, and clears the PID. `status` prints a small table with the PID, port, healthz status, DB path and attachments path.

Acceptance is that `slashcash start` brings up the dashboard, `slashcash status` prints a green row, and Ctrl-C returns a clean exit with no stray processes.

## Sequencing and rough schedule

W1 is the anchor. Most other workstreams get easier once the cloud surface is gone and the workspace isn't importing packages it shouldn't. A reasonable serial order for one engineer over about two weeks: W1 first (and most of it can land in a day or two if we're brutal about deletion), then W2 scaffold in parallel with W3's schema port; then W4 when the DB is compiling; then W5 and W6 together; then W7 wiring it all up into a demoable flow; then a polish day for error messages, doctor output and the `packages/docs` updates.

## End-to-end verification

Before declaring Phase 1 done, the Phase 1 scenario in [`../reference/testing.md`](../reference/testing.md) must run cleanly on a developer machine that has never run `slashcash` before. At a high level the scenario is: fresh clone, no `~/.slashcash/` on disk, Ollama running with `gemma3n:e4b` pulled, one command to install dependencies, then `slashcash doctor` comes up green, `slashcash db seed` populates SQLite, `slashcash start` brings up the dashboard on loopback, an automated check hits the dashboard and the healthz endpoint, the assistant streams a reply, and `slashcash stop` shuts everything down with no stray processes and no stale PID. The same script runs in CI wherever the environment supports it (at minimum on a macOS runner for Phase 1), so this gate is reproducible rather than anecdotal. The test harness and where it lives is specified in `reference/testing.md`; openclaw's smoke-flow test is the pattern to study.

## Exit gate

Phase 1 is done when the end-to-end scenario above passes from a clean state, `slashcash start` boots the dashboard with seeded data, the assistant streams from local `gemma3n:e4b`, `slashcash doctor` is green, `slashcash stop` is clean, there are no imports of any removed cloud dependency, the CI no longer runs hosted-app workflows, and `packages/docs` has been updated to match anything that moved during the phase.

## Pending — hand to next agent

The fixture-backed Phase 1 gates are green (`pnpm e2e:phase-1`, architecture smells, SQLite swap, local Ollama provider, seed, `start`/`stop`/`doctor`). What the repo still has not verified:

- [ ] Run Phase 1 on a real clean macOS machine **without** `SLASHCASH_DOCTOR_SKIP_OLLAMA=1`, against a live Ollama service.
- [ ] Verify the assistant streams from a real local `gemma3n:e4b` rather than the skipped fixture path.
- [ ] Confirm no hidden hosted/auth leftovers survive a production build — extend the smell gate beyond source-level greps to inspect the built `apps/main` output (e.g. `next build` artefacts and the CLI tarball).

Verification commands the next agent should rerun:

```bash
pnpm typecheck
pnpm lint
pnpm architecture-smells
pnpm --filter @workspace/database test
pnpm --filter slashcash test
pnpm e2e:phase-1
```

## Deferred to Phase 2

Real Gmail ingest through `gws`. The `slashcash onboard` interactive wizard. The Swiggy analytics rewrite on SQLite. PDF attachment storage and the attachment serving route. The Ollama vision path for PDF parsing. The skill registry and the bundled `gmail-swiggy` skill. Publishing to npm with the Next.js app bundled in standalone mode. Evals as a quality gate.
