# Testing — philosophy and end-to-end gates

This document defines how we prove each phase is done. It is the single source of truth for what "end to end" means in this local-first product.

The model we use has three layers. The bottom layer is **unit tests** colocated next to the code. They are a permanent baseline and run on every commit. The middle layer is **targeted integration tests** for the handful of modules where the behaviour really lives at a boundary (the `gws` wrapper, the Ollama provider, the doctor checks, the cron single-flight, the attachment-serving route, the skill registry). These also run on every commit. The top layer is an **end-to-end scenario per phase** that spins up the real CLI against a real local stack and exercises the user flow the phase promises. The E2E scenario is the merge gate for the phase; unit and integration tests are the merge gate for individual PRs inside the phase.

The point of the E2E gate is that none of the steps below are simulated. We don't mock `gws`, we don't stub Ollama, we don't swap SQLite for memory, and we don't assert on internal functions. The scenario runs the same binary a user would run and checks observable outcomes — HTTP responses, rows in SQLite, files in the attachments directory, processes on the machine.

## Where tests live

Unit and integration tests live next to their code under each workspace package. The E2E harness lives in `packages/e2e-tests` (the existing Playwright package is repurposed; it no longer tests the hosted app). Fixtures and expected snapshots for analytics live under `packages/database/test-fixtures/`. Eval datasets stay in `packages/evals/` as they are today but run against the local provider.

The harness exposes `pnpm e2e:phase-1` through `pnpm e2e:phase-5`, `pnpm e2e:all`, `pnpm architecture-smells`, `pnpm fixtures:check`, `pnpm bench`, and `pnpm eval:gate`. Phase E2E scripts are intended to run from a clean machine state; the harness itself handles clean-up of temporary `SLASHCASH_HOME` directories between runs, but it never touches files outside that directory and Homebrew's install prefix.

## Learning from `../openclaw`

Openclaw already runs a smoke-flow test of its CLI end to end. Study the shape before writing ours: how it boots a test config directory, how it invokes the compiled binary, how it waits for readiness via healthz, how it asserts on stdout with structured matchers, and how it tears down between cases. The harness we build here should feel familiar to anyone who has read openclaw's version. Adopt the shape; don't copy the code.

## Phase 1 end-to-end scenario

The preconditions are a fresh clone of the monorepo and no `~/.slashcash/` on disk. Ollama is installed and the machine has pulled `gemma3n:e4b` (the harness checks this and fails loudly if not, because pulling a model inside a test run is slow and flaky). Node 20+ and pnpm are available.

The scenario walks through the following observable steps in order. Install workspace dependencies. Run `slashcash doctor` and assert it exits green, creates `~/.slashcash/` with the expected subdirectories, and writes a default `config.json`. Run `slashcash db seed` and assert SQLite exists at the configured path and row counts in the seeded tables match the fixture. Run `slashcash start` in the background; poll `/api/healthz` on the configured loopback port until it answers with the expected JSON body. Open the root dashboard URL via HTTP and assert the response is a 200 with HTML rather than a redirect to any auth path. Hit the assistant API with a fixed prompt and assert a streaming response comes back and contains at least one token from the local model. Run `slashcash status` and assert the PID, port, healthz state, DB path and attachments path match what's actually true on the machine. Run `slashcash stop` and assert the process is gone, the PID file is gone, and `pgrep`-style checks find no orphan children. Re-run `slashcash doctor` and assert it's still green after the shutdown.

Any failed assertion fails the phase gate. The scenario produces a short machine-readable summary (pass/fail per step, elapsed time, and the `~/.slashcash/logs/` tail) that is attached as a CI artifact.

## Phase 2 end-to-end scenario

The preconditions are harsher on purpose: a clean macOS environment where Homebrew, Ollama, `gws` and `~/.slashcash/` do not exist, no copy of the monorepo installed, and a dedicated test Google account with a small, deterministic set of Swiggy emails already in its inbox. The CI machine or a dedicated test box provides the credentials path for `gws` via an environment variable that points at a pre-authorised credentials file, so the scenario can run non-interactively; on a developer machine the same scenario runs interactively and waits for the OAuth consent screen.

The scenario walks through: `npm i -g slashcash` from the published tarball (on the release candidate) or from the local pack (on normal runs). Run `slashcash onboard` and assert it completes every step idempotently: Homebrew present, Ollama installed and serving, `gemma3n:e4b` pulled, `gws` installed and authenticated, `~/.slashcash/` created with the bundled skill copied in and marked enabled, SQLite migrated. Run `slashcash start` and wait for healthz. Trigger a full sync with `slashcash sync --full` and wait for `emails.getSyncProgress` to report completion. Assert the expected transactions appear in `transactions_v2`, that their totals match the known fixture for the test account within a small tolerance, and that at least one attachment PDF is present under `~/.slashcash/attachments/`. Fetch the attachment through the Next.js route and assert the bytes match the file on disk. Hit the assistant API with a Swiggy-specific question that requires one of the analytics tools and assert the streamed answer contains the expected numeric answer. Run the eval harness end-to-end and assert the configured thresholds pass. Run `slashcash skills disable gmail-swiggy`, wait one cron tick, run `slashcash sync --full` again, and assert no new rows were ingested. Run `slashcash stop` and assert a clean shutdown with no orphan `gws` children. Re-run `slashcash onboard` and assert it's a fast no-op.

The repository also includes `packages/e2e-tests/scenarios/phase-2.ts`, a fixture-backed version of the same flow for local development and CI environments that cannot use a real Google account. It sets `SLASHCASH_GWS_FIXTURE_DIR`, runs `onboard --dry-run`, imports a Swiggy Gmail fixture, checks the attachment route, verifies skill disabling blocks ingest, and shuts the local server down cleanly.

As with Phase 1, every assertion failure fails the gate and artefacts are uploaded.

## Phase 3 end-to-end scenario

`packages/e2e-tests/scenarios/phase-3.ts` exercises the onboarding UX and doctor JSON surface against an isolated home directory. It runs `slashcash onboard --dry-run --yes`, re-runs the wizard to prove the idempotent path is quick, then parses `slashcash doctor --quick --json` to confirm the machine-readable check shape is valid. Hidden skip flags remain gated behind `SLASHCASH_E2E=1`.

The full clean-machine cancellation test is still a manual dogfood step because it requires killing a real `ollama pull` mid-stream. The automated fixture scenario protects the CLI contract and the idempotency regression surface on every PR.

## Phase 4 end-to-end scenario

`packages/e2e-tests/scenarios/phase-4.ts` is the meta gate for the test pyramid. It runs the architecture smell test, fixture validation, and the per-package test scripts for `packages/cli`, `packages/tasks`, and `packages/database`. App and UI packages expose `pnpm test` as typecheck/lint gates until their broader Playwright and component suites are filled in.

`pnpm fixtures:check` parses every committed JSON fixture under the database, tasks, and E2E fixture roots and verifies canonical formatting. This gives fixture changes an explicit CI surface instead of letting drift hide inside unrelated PRs.

## Phase 5 end-to-end scenario

`packages/e2e-tests/scenarios/phase-5.ts` covers the release-readiness gates that can run without external credentials: the eval gate, the performance budget harness, and the logs reader against a structured fixture event. Release-only verification of the published npm tarball lives in `.github/workflows/release.yml`, where the package is published with provenance, a SBOM and checksum are attached, and the published bin is smoke-tested through `slashcash --version`.

## How this gate is enforced

The phase-complete PR runs the appropriate `e2e:phase-N` script in CI on a macOS runner that is configured to match the scenario's preconditions. For Phase 2 specifically, the Google test account's credentials live in a CI secret that is mounted into the runner as a `gws` credentials file; under no circumstances do real end-user credentials go near the test path. No deploy, no tag and no npm publish happens unless the E2E script is green.

In addition to CI, every phase ends with a **manual dogfood run** on the primary maintainer's personal machine. The scenarios above are the minimum; the dogfood run includes whatever ad-hoc probing exposes regressions that automation missed. External release tasks that require npm permissions, DNS changes, a real Google test account, or a published package cannot be completed by local fixture tests alone; those are tracked in the release workflow and final dogfood checklist.

## Architecture smell gate

`packages/e2e-tests/architecture-smells.test.ts` walks source and package manifests to reject known regressions: hosted-era imports, hosted-era environment variables, auth route directories, Trigger.dev config, and Postgres/auth-token references in the database package. Generated outputs (`dist`, `.next`, `node_modules`) and `packages/docs` are ignored so the gate checks source-of-truth files only.

## What is explicitly out of scope for local fixture testing

We are not setting up a full cross-platform E2E matrix in v1 (macOS only — see ADR-008). We are not exercising multi-user flows (single-user — see ADR-005). We are not running long-duration soak tests. We are not load-testing analytics against a large transaction corpus; the fixture is representative of a real one-person Swiggy history. Published-package, npm provenance, SBOM, DNS and real-account Gmail checks require external services and remain release/dogfood gates rather than ordinary local test fixtures.
