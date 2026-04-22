# Testing — customer journeys and release gates

This document defines how we prove slash.cash works for a real customer. Phases still exist as roadmap checkpoints, but they are no longer the main way we describe product coverage. The primary language is customer behaviour: what a user can do in the app, what the CLI can do on their machine, and what release gates still need to hold.

The model we use has four layers. The bottom layer is **unit tests** colocated next to the code. They are a permanent baseline and run on every commit. The next layer is **targeted integration tests** for the handful of modules where the behaviour really lives at a boundary (the `gws` wrapper, the Ollama provider, the doctor checks, the cron single-flight, the attachment-serving route, the skill registry). The next layer is **customer-journey UI coverage** in Playwright, which drives the seeded app through the same `slashcash start` path a user runs locally. The top layer is a set of **phase acceptance gates** that still spin up the real CLI against a local stack and prove the roadmap promises have not regressed. The phase gates are milestones; the journey suite is the day-to-day product story.

The point of the E2E gate is that none of the steps below are simulated. We don't mock `gws`, we don't stub Ollama, we don't swap SQLite for memory, and we don't assert on internal functions. The scenario runs the same binary a user would run and checks observable outcomes — HTTP responses, rows in SQLite, files in the attachments directory, processes on the machine.

## Where tests live

Unit and integration tests live next to their code under each workspace package. The E2E harness lives in `packages/e2e-tests`. Fixtures and expected snapshots for analytics live under `packages/database/test-fixtures/`. Eval datasets stay in `packages/evals/` as they are today but run against the local provider.

The harness exposes `pnpm e2e:journeys`, `pnpm e2e:phase-1` through `pnpm e2e:phase-5`, `pnpm e2e:all`, `pnpm architecture-smells`, `pnpm fixtures:check`, `pnpm bench`, and `pnpm eval:gate`. Journey tests always create a deterministic local state directory, seed the database, import one Gmail fixture receipt, and start the app through `slashcash start`. Phase E2E scripts are still intended to run from a clean machine state; the harness itself handles clean-up of temporary `SLASHCASH_HOME` directories between runs, but it never touches files outside that directory and Homebrew's install prefix.

## Learning from `../openclaw`

Openclaw is the reference for how to organise this work: scenario-driven coverage, repo-backed fixtures, isolated local state per run, and behaviour suites that read like the product rather than the implementation schedule. The harness we build here should feel familiar to anyone who has read openclaw's QA docs. Adopt the shape; don't copy the code.

## Customer-journey suite

`pnpm e2e:journeys` is the main UI-facing product suite. Today it covers:

- Dashboard exploration: open the app without sign-in, land on `/dashboard`, and confirm the seeded analytics context is visible.
- Product navigation: move between dashboard, transactions, assistant, settings, and feedback from the app shell.
- Transaction review: inspect seeded + fixture-imported transactions, reverse sort order, and open a receipt in the PDF viewer.
- Assistant behaviour: start a chat, observe a streamed reply from a local mock Ollama-compatible server, and return to a fresh chat.
- Feedback capture: submit in-app feedback and see the success state.

This suite is intentionally written in customer language. The underlying setup details — seed data, fixture Gmail sync, mock Ollama — are harness responsibilities, not the thing the spec names lead with.

## Phase 1 acceptance gate

The preconditions are a fresh clone of the monorepo and no `~/.slashcash/` on disk. Ollama is installed and the machine has pulled `gemma3n:e4b` (the harness checks this and fails loudly if not, because pulling a model inside a test run is slow and flaky). Node 20+ and pnpm are available.

The scenario walks through the following observable steps in order. Install workspace dependencies. Run `slashcash doctor` and assert it exits green, creates `~/.slashcash/` with the expected subdirectories, and writes a default `config.json`. Run `slashcash db seed` and assert SQLite exists at the configured path and row counts in the seeded tables match the fixture. Run `slashcash start` in the background; poll `/api/healthz` on the configured loopback port until it answers with the expected JSON body. Open the root dashboard URL via HTTP and assert the response is a 200 with HTML rather than a redirect to any auth path. Hit the assistant API with a fixed prompt and assert a streaming response comes back and contains at least one token from the local model. Run `slashcash status` and assert the PID, port, healthz state, DB path and attachments path match what's actually true on the machine. Run `slashcash stop` and assert the process is gone, the PID file is gone, and `pgrep`-style checks find no orphan children. Re-run `slashcash doctor` and assert it's still green after the shutdown.

Any failed assertion fails the phase gate. The scenario produces a short machine-readable summary (pass/fail per step, elapsed time, and the `~/.slashcash/logs/` tail) that is attached as a CI artifact.

## Phase 2 acceptance gate

The preconditions are harsher on purpose: a clean macOS environment where Homebrew, Ollama, `gws` and `~/.slashcash/` do not exist, no copy of the monorepo installed, and a dedicated test Google account with a small, deterministic set of Swiggy emails already in its inbox. The CI machine or a dedicated test box provides the credentials path for `gws` via an environment variable that points at a pre-authorised credentials file, so the scenario can run non-interactively; on a developer machine the same scenario runs interactively and waits for the OAuth consent screen.

The scenario walks through: `npm i -g slashcash` from the published tarball (on the release candidate) or from the local pack (on normal runs). Run `slashcash onboard` and assert it completes every step idempotently: Homebrew present, Ollama installed and serving, `gemma3n:e4b` pulled, `gws` installed and authenticated, `~/.slashcash/` created with the bundled skill copied in and marked enabled, SQLite migrated. Run `slashcash start` and wait for healthz. Trigger a full sync with `slashcash sync --full` and wait for `emails.getSyncProgress` to report completion. Assert the expected transactions appear in `transactions_v2`, that their totals match the known fixture for the test account within a small tolerance, and that at least one attachment PDF is present under `~/.slashcash/attachments/`. Fetch the attachment through the Next.js route and assert the bytes match the file on disk. Hit the assistant API with a Swiggy-specific question that requires one of the analytics tools and assert the streamed answer contains the expected numeric answer. Run the eval harness end-to-end and assert the configured thresholds pass. Run `slashcash skills disable gmail-swiggy`, wait one cron tick, run `slashcash sync --full` again, and assert no new rows were ingested. Run `slashcash stop` and assert a clean shutdown with no orphan `gws` children. Re-run `slashcash onboard` and assert it's a fast no-op.

The repository also includes `packages/e2e-tests/scenarios/phase-2.ts`, a fixture-backed version of the same flow for local development and CI environments that cannot use a real Google account. It sets `SLASHCASH_GWS_FIXTURE_DIR`, runs `onboard --dry-run`, imports a Swiggy Gmail fixture, checks the attachment route, verifies skill disabling blocks ingest, and shuts the local server down cleanly.

As with Phase 1, every assertion failure fails the gate and artefacts are uploaded.

## Phase 3 acceptance gate

`packages/e2e-tests/scenarios/phase-3.ts` exercises the onboarding UX and doctor JSON surface against an isolated home directory. It runs `slashcash onboard --dry-run --yes`, re-runs the wizard to prove the idempotent path is quick, then parses `slashcash doctor --quick --json` to confirm the machine-readable check shape is valid. Hidden skip flags remain gated behind `SLASHCASH_E2E=1`.

The full clean-machine cancellation test is still a manual dogfood step because it requires killing a real `ollama pull` mid-stream. The automated fixture scenario protects the CLI contract and the idempotency regression surface on every PR.

## Phase 4 acceptance gate

`packages/e2e-tests/scenarios/phase-4.ts` is the meta gate for the test pyramid. It runs the architecture smell test, fixture validation, and the per-package Vitest scripts for `packages/cli`, `packages/tasks`, `packages/database`, `packages/ui`, and `apps/main`. The Playwright layer now covers customer journeys through the real CLI boot path; the remaining work in this phase is broader boundary integration depth and higher coverage, not replacing stale hosted-app specs.

The first boundary integration spec is `packages/tasks/src/utils/gws.integration.test.ts`. Run it with `VITEST_INTEGRATION=1 pnpm --filter @workspace/tasks test`. It stays fixture-backed: the test parses recorded Gmail list/message/attachment JSON, feeds command stdout through an injected `gws` runner, and asserts every documented `GwsErrorCode` is reachable without invoking the real `gws` binary or any Google service. The rest of the W3 boundary specs are still pending.

`pnpm fixtures:check` parses every committed JSON fixture under the database, tasks, and E2E fixture roots and verifies canonical formatting. This gives fixture changes an explicit CI surface instead of letting drift hide inside unrelated PRs.

## Phase 5 acceptance gate

`packages/e2e-tests/scenarios/phase-5.ts` covers the release-readiness gates that can run without external credentials: the eval gate, the performance budget harness, and the logs reader against a structured fixture event. Release-only verification of the published npm tarball lives in `.github/workflows/release.yml`, where the package is published with provenance, a SBOM and checksum are attached, and the published bin is smoke-tested through `slashcash --version`.

`pnpm pack:local` also runs `bundle:pack-smoke` after creating `packages/cli/slashcash-*.tgz`. That smoke installs the tarball into a temporary npm prefix, verifies the packaged dashboard includes `.next/BUILD_ID`, and verifies the server can resolve its runtime modules (`next`, `react`, `react-dom`, and database runtime deps) from the installed layout. This catches npm-pack layout regressions that are invisible when inspecting pnpm's local symlinked `dist/app/node_modules` tree.

## How this gate is enforced

The phase-complete PR runs the appropriate `e2e:phase-N` script in CI on a macOS runner that is configured to match the scenario's preconditions. For Phase 2 specifically, the Google test account's credentials live in a CI secret that is mounted into the runner as a `gws` credentials file; under no circumstances do real end-user credentials go near the test path. No deploy, no tag and no npm publish happens unless the E2E script is green.

In addition to CI, every phase ends with a **manual dogfood run** on the primary maintainer's personal machine. The scenarios above are the minimum; the dogfood run includes whatever ad-hoc probing exposes regressions that automation missed. External release tasks that require npm permissions, DNS changes, a real Google test account, or a published package cannot be completed by local fixture tests alone; those are tracked in the release workflow and final dogfood checklist.

## Architecture smell gate

`packages/e2e-tests/architecture-smells.test.ts` walks source and package manifests to reject known regressions: hosted-era imports, hosted-era environment variables, auth route directories, Trigger.dev config, and Postgres/auth-token references in the database package. Generated outputs (`dist`, `.next`, `node_modules`) and `packages/docs` are ignored so the gate checks source-of-truth files only.

## What is explicitly out of scope for local fixture testing

We are not setting up a full cross-platform E2E matrix in v1 (macOS only — see ADR-008). We are not exercising multi-user flows (single-user — see ADR-005). We are not running long-duration soak tests. We are not load-testing analytics against a large transaction corpus; the fixture is representative of a real one-person Swiggy history. Published-package, npm provenance, SBOM, DNS and real-account Gmail checks require external services and remain release/dogfood gates rather than ordinary local test fixtures.
