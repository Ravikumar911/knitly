# Phase 4 — The full testing pyramid

> *Goal: every layer of `reference/testing.md` actually exists. The bottom layer (unit) covers each package, the middle layer (integration) covers every boundary module, the top layer (E2E) covers every user-visible flow. CI runs all three layers on every push, fails on coverage regression, and runs against a Node version matrix. The discipline is openclaw's: tests next to the code, integration tests for the seams, end-to-end tests that exercise the binary the user runs.*

Phase 4 closes the test debt called out in [`audit-phase-1-2.md`](./audit-phase-1-2.md). It does not add product surface; it makes the existing surface defendable. After Phase 4, no PR merges without a full pyramid run, and adding new behaviour without tests is a CI-blocking smell.

**Standing conventions.** Same as before — `../openclaw` is the reference shape. Most directly relevant here: the test colocation pattern (`*.test.ts` next to `*.ts`), the integration-test naming (`*.integration.test.ts` for boundary tests, `*.e2e.test.ts` for harness-driven scenarios), the `architecture-smells.test.ts` discipline (a CI gate that prevents specific known regressions), the per-package vitest config that extends a shared workspace config, the global setup module that prepares an isolated home directory per test (`openclaw:test/global-setup.ts`), and the prepack/release-check tests that run before any publish.

The phase is not done until the Phase 4 acceptance script runs in CI on a fresh PR and reports the four green badges (unit, integration, E2E, smells) at the agreed coverage threshold; the previous phases' E2E scenarios continue to pass.

## Success criteria

1. Every workspace package (`packages/cli`, `packages/database`, `packages/tasks`, `packages/ui`, `apps/main`) has a working `pnpm test` that runs vitest on colocated `*.test.ts` files. Test discovery, watch mode and coverage report all work locally and in CI.
2. Statement coverage across all production code is at or above the target floor: 80% for `packages/cli`, `packages/database`, `packages/tasks`; 70% for `apps/main`; 60% for `packages/ui` (UI components are partially exercised through Playwright). Coverage thresholds are enforced in CI; PRs that drop below fail.
3. Integration tests exist and run on every PR for: the `gws` wrapper, the Ollama provider, the SQLite query layer (analytics snapshots), the doctor check pipeline, the cron single-flight mutex, the attachment-serving route, the skill registry, the assistant tRPC route, the standardised CLI error format, and the bundled-skill manifest schema.
4. Playwright E2E covers the dashboard, the transactions list and filters, the assistant streaming UI, the PDF viewer, and the settings pages. Tests run against a fresh seeded SQLite per spec and a CLI-spawned Next.js, not a separately-managed dev server.
5. The Phase 1, Phase 2 and Phase 3 E2E scenarios all pass on every PR. The Phase 4 scenario script confirms the previous phases haven't regressed.
6. CI runs the full pyramid on Node 20 and Node 22 on a macOS runner; smell tests run on Linux too (cheap and catches portability surprises early).
7. A new `architecture-smells.test.ts` enforces forbidden imports, forbidden directories, forbidden DB references, the CLI error block format, and the `--help` output matching `reference/cli.md`. The test fails the build on regression.
8. `reference/testing.md` is updated to match what's actually wired (it currently describes the target; Phase 4 makes the description true).

A demo at end of phase: open a PR that intentionally introduces a forbidden import, a missing test for a new code branch, and a regression in analytics output. CI fails on three distinct red checks within a couple of minutes, each pointing at the exact file and line.

## Workstreams overview

Sizing as before. Phase 4 is mostly M-sized work; the bulk is grinding out tests rather than shipping features.

1. **W1 — Vitest workspace setup and per-package unit tests (M).** A shared vitest config under `packages/typescript-config/`, per-package extension, watch mode that respects workspace deps, coverage thresholds, the openclaw global-setup pattern adapted to our state directory.
2. **W2 — Architecture smell tests (S).** Centralise every "we don't allow this" rule as a single test file, replacing the manual greps from Phase 1/2. Forbidden imports, forbidden directories, forbidden DB references, CLI error block format compliance, `--help` vs. `reference/cli.md` parity.
3. **W3 — Integration tests for every boundary (L).** One spec per boundary module, exercising the real subsystem against fixtures and asserting closed-error-union behaviour. The biggest single piece of Phase 4 work.
4. **W4 — Analytics snapshot tests (M).** Pin every analytics procedure's output against the seed database into a snapshot fixture under `packages/database/test-fixtures/`. Snapshot-driven regression suite for the W5 work from Phase 2.
5. **W5 — Playwright UI E2E expansion (M).** Repurpose the existing `packages/e2e-tests` Playwright tests away from the hosted-app assumptions; cover dashboard, transactions, assistant, PDF viewer, settings; spawn Next.js through the CLI rather than against a dev server.
6. **W6 — CLI E2E scenarios for Phase 1/2/3 + Phase 4 meta-scenario (S).** Codify the rerun-previous-phases discipline into a single `e2e:all` script that runs all phase scenarios and reports a single pass/fail.
7. **W7 — CI orchestration and matrix (M).** GitHub Actions workflows: per-PR fast tier (unit + smells + integration on Node 20 macOS), nightly slow tier (everything on Node 20 + 22 macOS, Node 20 Linux for smells), required-checks configuration, coverage report upload.
8. **W8 — Test data and fixture discipline (S).** A single source of truth for every fixture (gws messages, swiggy seed, analytics snapshots), a `pnpm fixtures:check` script that diffs generated fixtures against committed ones, and a fixtures-update workflow that gates regeneration behind explicit approval.
9. **W9 — Mutation, contract and property-based tests where they pay off (S).** Stretch goals: property-based tests for the gws stderr classifier (any random JSON shouldn't crash it), contract tests for the manifest schema, and a single mutation-testing run on `packages/database/src/queries/insights/` to validate the analytics snapshot suite.

## W1 — Vitest workspace setup and per-package unit tests

A shared base config at `packages/typescript-config/vitest.base.ts` defines: the test file pattern (`**/*.test.ts`), the integration pattern (`**/*.integration.test.ts`, opt-in via `VITEST_INTEGRATION=1`), the global setup module path, the coverage provider (`v8`), the coverage exclude list (build artifacts, generated migrations, third-party shims), and the default reporter (`default` locally, `github-actions` + `junit` in CI).

Each package adds a `vitest.config.ts` that extends the base, sets `test.coverage.thresholds` to its agreed floor, and points to the per-package global setup. The global setup creates a unique `~/.slashcash-test-<random>/` per test run, sets `SLASHCASH_HOME`, `SQLITE_DB_PATH`, `SLASHCASH_ATTACHMENTS_DIR`, and tears down on `afterAll`. This mirrors `openclaw:test/setup-home-isolation.test.ts` and is the single most important piece of test infrastructure — every test that touches state goes through it.

Unit-test scope per package, in priority order:

- `packages/cli`: every module under `src/cli/registry/`, `src/onboard/`, `src/doctor/`, `src/start/`, `src/skills/`, `src/runtime/`, `src/config/`, `src/errors/`. Targets are pure logic (parsing, formatting, dispatching) plus the small subprocess wrapper layer. Subprocess calls are dependency-injected so tests pass a fake `runCommand`.
- `packages/database`: every query in `src/queries/`, every helper in `src/seed/`, the migration runner. Each query test sets up an isolated SQLite file via the global setup, seeds the relevant rows, runs the query and asserts.
- `packages/tasks`: the gws wrapper, the email parser, the PDF extractor, the dedupe matcher, the mutex utility, the job registry. Each test runs against fixtures committed to `packages/tasks/test-fixtures/`.
- `apps/main`: tRPC routers (constructed in isolation per test, no Next.js server), the assistant route handler (mocked Ollama), `lib/ai/tools/*`, `lib/oauth.ts`-replacement helpers, `hooks/*` (with React Testing Library + jsdom).
- `packages/ui`: render smoke tests for each component plus interaction tests for the high-traffic ones (`ai-elements/*`, `transactions/*`, `assistant/*`).

Acceptance: `pnpm -r test` runs every package's unit suite in under 60 seconds locally, every coverage report meets the floor, watch mode (`pnpm -r test --watch`) only reruns affected files.

## W2 — Architecture smell tests

A single file at `packages/e2e-tests/architecture-smells.test.ts` (named to match openclaw for findability) holds every "this is not allowed" rule with one test case per rule. Today's rules:

- **No forbidden imports.** Walk every `*.ts` file under `apps/`, `packages/`, fail if any imports `@supabase/*`, `@trigger.dev/*`, `@vercel/analytics`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/mistral`, `pg`, `postgres`. Allow-listed: nothing.
- **No forbidden directories.** Fail if `apps/main/app/(auth)/` exists, if `apps/main/app/auth/` exists, if `apps/main/supabase/` exists, if `packages/tasks/trigger.config.ts` exists.
- **No forbidden DB references.** Walk every `packages/database/src/**/*.ts`, fail if any string literal mentions `user_google_tokens`, `token_access_logs`, `auth.users`, `auth.`, `pg-core`, `jsonb`, `ilike`, `doublePrecision`, `pgSchema`.
- **CLI error block format.** Walk every `console.error` and `throw new Error` reachable from a CLI command, fail if the message doesn't go through one of the registered error classes (`OnboardError`, `GwsError`, `DoctorError`, `RuntimeError`). Implementation: AST-walk via `ts-morph`, check the throw target.
- **`--help` matches `reference/cli.md`.** Spawn `slashcash --help` and `slashcash <every command> --help`, parse the output, parse `reference/cli.md`, fail on drift. Drift is a doc bug or a CLI bug — either way the PR doesn't merge.
- **Forbidden env-var references.** Fail if any source file references `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TRIGGER_SECRET_KEY`, `GOOGLE_CLIENT_SECRET`, `BRAINTRUST_API_KEY`, `VERCEL_URL`, `NEXT_PUBLIC_VERCEL_URL`, `MODEL_NAME`.

Each rule is one test case, fast, and prints exactly which file/line tripped it.

Acceptance: introducing any forbidden import, directory, DB reference, or unaligned `--help` block in a PR fails CI within 30 seconds with a precise pointer.

## W3 — Integration tests for every boundary

One integration spec per boundary module, named `*.integration.test.ts`, opt-in via `VITEST_INTEGRATION=1` so they don't slow `pnpm test --watch` locally but always run in CI.

Specs to land:

- **`packages/tasks/src/utils/gws.integration.test.ts`** — feeds recorded `gws` stdout/stderr fixtures into the wrapper, asserts every documented `GwsErrorCode` is reachable, asserts the happy-path message-list parse round-trips. No real `gws` invocation.
- **`packages/cli/src/runtime/ollama.integration.test.ts`** — boots a tiny stub HTTP server that mimics Ollama's `/api/tags`, `/api/pull` (with progress chunks) and `/api/chat` endpoints, asserts the provider streams responses, the pull progress parser produces the expected `{ layer, completed, total, percent }` events, and the timeout/error mapping returns the expected closed codes.
- **`packages/cli/src/doctor/run.integration.test.ts`** — runs the doctor pipeline against a constructed fake environment (some checks pass, some fail, some have repairs), asserts the JSON output schema, asserts `--quick` skips network checks, asserts `--fix` runs the right repair in the right order.
- **`packages/tasks/src/runtime/mutex.integration.test.ts`** — fires N concurrent calls at the mutex with a slow inner function, asserts exactly one runs at a time, asserts the SIGTERM-during-tick path lets the in-flight tick finish within the grace window.
- **`apps/main/app/api/attachments/[id]/route.integration.test.ts`** — boots the Next.js route in isolation against a temp attachments dir, asserts a happy-path PDF stream, asserts a path-traversal id returns 400, asserts a missing id returns 404, asserts the content-type and content-length headers.
- **`packages/cli/src/skills/registry.integration.test.ts`** — populates a temp skills dir with valid and invalid manifests, asserts the validator rejects every invalid shape, asserts enable/disable round-trips through `config.json`, asserts the `skills:changed` event fires.
- **`apps/main/app/api/assistant/route.integration.test.ts`** — boots the assistant route against a stub Ollama server, asserts the streaming response, asserts the typed-tool-only contract (no raw SQL ever reaches SQLite via the assistant path; this is enforced by spying on the SQLite driver).
- **`packages/cli/src/errors/format.integration.test.ts`** — feeds every error class through the formatter, asserts the four-line block, asserts `formatCliError` is the only path that prints to stderr from a registered error.
- **`packages/cli/src/skills/jobs.integration.test.ts`** — registers two skills with overlapping schedules, asserts mutex keys are honoured, asserts `skills disable` mid-loop deregisters within a tick, asserts no orphan timers on shutdown.

Acceptance: each spec runs in under 5 seconds, the whole integration tier runs in under two minutes, every closed error code in every boundary union is reached by at least one test case (a coverage assertion enforces this).

## W4 — Analytics snapshot tests

A new fixture directory at `packages/database/test-fixtures/analytics/` holds one JSON snapshot per analytics procedure. The seed from Phase 1 W6 is the canonical input; the procedure outputs are pinned to fixtures.

A single test file at `packages/database/src/queries/insights/swiggyAnalytics.test.ts` iterates every export, runs it against the seeded DB, and snapshot-asserts the result. Updating a snapshot is an explicit `pnpm test --update -t analytics` invocation; CI fails on uncommitted snapshot changes.

This makes the Phase 2 W5 promise — "every query's output is pinned to a fixture, the rewrite has to reproduce that fixture" — actually enforced and not just aspirational.

Acceptance: deliberately changing one analytics function's grouping logic produces a precise snapshot diff in CI; reverting the change clears the diff; adding a new analytics procedure is gated on producing its snapshot in the same PR (a directory listing test enforces this).

## W5 — Playwright UI E2E expansion

The existing `packages/e2e-tests/tests/authenticated.spec.ts` and `unauthenticated.spec.ts` were written for the hosted-app shape and are stale. They are replaced by:

- `dashboard.spec.ts` — load the dashboard, assert the headline cards render, assert a transaction list appears.
- `transactions.spec.ts` — filter by date range, by merchant, by amount range; assert the URL query state and the rendered rows.
- `assistant.spec.ts` — send a fixed prompt, assert a streamed response begins within 3 seconds, assert the message renders.
- `pdf-viewer.spec.ts` — open a transaction with an attached PDF, assert the viewer renders, assert the bytes match the on-disk file.
- `settings.spec.ts` — toggle the bundled skill, assert the toggle persists across a reload.

The Playwright config spawns the CLI in dev mode (or pack-installed mode if `SLASHCASH_E2E_FROM_TARBALL=1`) on a unique port per worker, with a unique `SLASHCASH_HOME`. The seed runs once per spec; the assistant tests stub Ollama via `SLASHCASH_OLLAMA_BASE_URL` pointed at a local fake. No spec depends on a previously-running server.

Acceptance: the Playwright suite runs in under 90 seconds, every spec runs in isolation, the artefact upload contains a screenshot per failed assertion.

## W6 — CLI E2E scenarios for Phase 1/2/3 + Phase 4 meta-scenario

A meta-script `pnpm e2e:all` runs `e2e:phase-1`, `e2e:phase-2`, `e2e:phase-3` in sequence, captures each scenario's exit code and elapsed time, and prints a single summary block. CI runs `e2e:all` on every PR; failure of any phase scenario fails the merge.

In addition, a Phase 4 scenario at `packages/e2e-tests/scenarios/phase-4.ts` exercises the cross-cutting things that don't belong to any one phase: a deliberately-broken Ollama (assert assistant route returns the standardised error block), a deliberately-broken `gws` install (assert doctor surfaces the `auth-invalid-client` block), a deliberately-corrupted `config.json` (assert the schema validator rejects it with the standardised block, doctor `--fix` writes a default and the user is prompted to confirm).

Acceptance: `pnpm e2e:all` is the single command a maintainer runs before tagging a release; it covers every documented scenario across phases.

## W7 — CI orchestration and matrix

Two workflows under `.github/workflows/`:

- **`pr.yml`** — runs on every PR. Jobs: `lint` (oxlint + tsc), `unit` (Node 20, macOS), `integration` (Node 20, macOS, `VITEST_INTEGRATION=1`), `smells` (Node 20, Linux), `playwright` (Node 20, macOS), `e2e-phase-1-and-3` (Node 20, macOS — Phase 2 is heavier and gated to nightly). Parallelism: jobs run in parallel where independent. Total wall time target: under 8 minutes.
- **`nightly.yml`** — runs on a schedule and on a `nightly` label. Same jobs as `pr.yml` plus: `unit-node22` (Node 22 matrix), `e2e-phase-2` (the heavier Gmail-fixture scenario), `e2e-all` (sequential meta-scenario), `tarball-smoke` (Phase 5 W1's pack-and-run check, but the test infrastructure lands here). Coverage report uploaded to a CI artifact.

Required checks on `main`: every `pr.yml` job. The nightly run is informational; a red nightly opens an issue automatically.

Acceptance: a PR that touches one CLI file completes the fast tier in under 5 minutes; the same PR with intentional regressions in coverage, smells, or unit tests fails the right job within 30 seconds of the failure point.

## W8 — Test data and fixture discipline

Every fixture lives under exactly one of three places: `packages/database/test-fixtures/` (seed snapshots, analytics outputs), `packages/tasks/test-fixtures/` (gws message JSON, raw email RFC822, sample PDFs), `packages/e2e-tests/fixtures/` (CLI/E2E scenario inputs). A fixture-generation script in each directory regenerates from a documented source; running the script and committing the diff is the way to update.

A single `pnpm fixtures:check` script regenerates every fixture into a temp dir and diffs against the committed copy. CI runs this on every PR; an unintended fixture change fails the build with the diff. To intentionally update, regenerate locally, commit, and reference the fixture-update guide in the PR description.

Acceptance: a fixture change made in source code without regenerating fails CI; a fixture regenerated locally and committed passes; the regeneration command is documented in `reference/testing.md`.

## W9 — Mutation, contract and property-based tests where they pay off

Stretch tier; only land what's clearly worth it.

- **Property-based test for the `gws` stderr classifier** using `fast-check`: any random ASCII string fed through the classifier returns a `GwsErrorCode` (no thrown exceptions); known signatures still classify correctly under arbitrary surrounding noise.
- **Manifest-schema contract test**: every bundled-skill `manifest.json` validates; intentionally corrupting one in a fixture fails the validation with the expected message.
- **Single mutation-testing run** on `packages/database/src/queries/insights/` via Stryker, gated weekly, surfaces analytics snapshot weaknesses. Not a CI-required check; informational and reviewed monthly.

Acceptance: each lands as one file with one or two test cases; nothing here is allowed to slow the fast CI tier.

## Sequencing and rough schedule

W1 and W2 land first (they unblock everything else). W3 is the single biggest piece and runs across the middle of the phase. W4 lands alongside W3 since it touches the same fixtures. W5 takes a focused day or two. W6, W7, W8 land in the final week. W9 is opportunistic.

A reasonable two-engineer schedule is two weeks: W1+W2 in week 1 days 1–2, W3 days 3–7 with W4 piggy-backing, W5 day 6, W6+W7 days 8–9, W8 day 10, W9 if time. Single-engineer is closer to three weeks because W3 is the time sink.

## End-to-end verification

The Phase 4 acceptance is itself a CI run rather than a one-off scenario script. The phase is done when:

1. A clean PR runs `pr.yml` to green within budget.
2. The nightly run produces green badges on Node 20 + Node 22 macOS, plus Linux smells.
3. A deliberately-broken PR produces the expected red check on the right job (we keep a "regression mirror" PR open, never merged, that we periodically rebase to validate this; openclaw does the same with its `release-check.test.ts`).
4. Coverage thresholds hold without lowering them.

## Exit gate

Phase 4 is done when: every success criterion above is met; `pr.yml` and `nightly.yml` are required and green on `main`; `reference/testing.md` is updated to describe what is actually wired (instead of what is aspirational); the `audit-phase-1-2.md` items tagged "fix in Phase 4" are checked off in that file; no production code path is excluded from coverage without a comment justifying why.

## Deferred to later phases

Cross-platform matrix (Linux, Windows) for unit and E2E (still ADR-007 / ADR-008 — macOS only for v1; Phase 4 only adds Linux smells as an early-warning). Performance benchmarks and memory-budget enforcement (Phase 5 W4). Security scans, dependency audit gates, signed-release verification (Phase 5 W1 + W2). Long-duration soak tests, load tests against larger transaction corpora (out of scope for v1; revisit when v2 traction warrants).
