# Testing — philosophy and end-to-end gates

This document defines how we prove each phase is done. It is the single source of truth for what "end to end" means in this local-first product.

The model we use has three layers. The bottom layer is **unit tests** colocated next to the code. They are a permanent baseline and run on every commit. The middle layer is **targeted integration tests** for the handful of modules where the behaviour really lives at a boundary (the `gws` wrapper, the Ollama provider, the doctor checks, the cron single-flight, the attachment-serving route, the skill registry). These also run on every commit. The top layer is an **end-to-end scenario per phase** that spins up the real CLI against a real local stack and exercises the user flow the phase promises. The E2E scenario is the merge gate for the phase; unit and integration tests are the merge gate for individual PRs inside the phase.

The point of the E2E gate is that none of the steps below are simulated. We don't mock `gws`, we don't stub Ollama, we don't swap SQLite for memory, and we don't assert on internal functions. The scenario runs the same binary a user would run and checks observable outcomes — HTTP responses, rows in SQLite, files in the attachments directory, processes on the machine.

## Where tests live

Unit and integration tests live next to their code under each workspace package. The E2E harness lives in `packages/e2e-tests` (the existing Playwright package is repurposed; it no longer tests the hosted app). Fixtures and expected snapshots for analytics live under `packages/database/test-fixtures/`. Eval datasets stay in `packages/evals/` as they are today but run against the local provider.

The harness exposes two scripts, `pnpm e2e:phase-1` and `pnpm e2e:phase-2`. Both are intended to run from a clean machine state; the harness itself handles clean-up of `~/.slashcash/` between runs on request, but it never touches files outside that directory and Homebrew's install prefix.

## Learning from `../openclaw`

Openclaw already runs a smoke-flow test of its CLI end to end. Study the shape before writing ours: how it boots a test config directory, how it invokes the compiled binary, how it waits for readiness via healthz, how it asserts on stdout with structured matchers, and how it tears down between cases. The harness we build here should feel familiar to anyone who has read openclaw's version. Adopt the shape; don't copy the code.

## Phase 1 end-to-end scenario

The preconditions are a fresh clone of the monorepo and no `~/.slashcash/` on disk. Ollama is installed and the machine has pulled `gemma3n:e4b` (the harness checks this and fails loudly if not, because pulling a model inside a test run is slow and flaky). Node 20+ and pnpm are available.

The scenario walks through the following observable steps in order. Install workspace dependencies. Run `slashcash doctor` and assert it exits green, creates `~/.slashcash/` with the expected subdirectories, and writes a default `config.json`. Run `slashcash db seed` and assert SQLite exists at the configured path and row counts in the seeded tables match the fixture. Run `slashcash start` in the background; poll `/api/healthz` on the configured loopback port until it answers with the expected JSON body. Open the root dashboard URL via HTTP and assert the response is a 200 with HTML rather than a redirect to any auth path. Hit the assistant API with a fixed prompt and assert a streaming response comes back and contains at least one token from the local model. Run `slashcash status` and assert the PID, port, healthz state, DB path and attachments path match what's actually true on the machine. Run `slashcash stop` and assert the process is gone, the PID file is gone, and `pgrep`-style checks find no orphan children. Re-run `slashcash doctor` and assert it's still green after the shutdown.

Any failed assertion fails the phase gate. The scenario produces a short machine-readable summary (pass/fail per step, elapsed time, and the `~/.slashcash/logs/` tail) that is attached as a CI artifact.

## Phase 2 end-to-end scenario

The preconditions are harsher on purpose: a clean macOS environment where Homebrew, Ollama, `gws` and `~/.slashcash/` do not exist, no copy of the monorepo installed, and a dedicated test Google account with a small, deterministic set of Swiggy emails already in its inbox. The CI machine or a dedicated test box provides the credentials path for `gws` via an environment variable that points at a pre-authorised credentials file, so the scenario can run non-interactively; on a developer machine the same scenario runs interactively and waits for the OAuth consent screen.

The scenario walks through: `npm i -g slashcash` from the published tarball (on the release candidate) or from the local pack (on normal runs). Run `slashcash onboard` and assert it completes every step idempotently: Homebrew present, Ollama installed and serving, `gemma3n:e4b` pulled, `gws` installed and authenticated, `~/.slashcash/` created with the bundled skill copied in and marked enabled, SQLite migrated. Run `slashcash start` and wait for healthz. Trigger a full sync with `slashcash sync --full` and wait for `emails.getSyncProgress` to report completion. Assert the expected transactions appear in `transactions_v2`, that their totals match the known fixture for the test account within a small tolerance, and that at least one attachment PDF is present under `~/.slashcash/attachments/`. Fetch the attachment through the Next.js route and assert the bytes match the file on disk. Hit the assistant API with a Swiggy-specific question that requires one of the analytics tools and assert the streamed answer contains the expected numeric answer. Run the eval harness end-to-end and assert the configured thresholds pass. Run `slashcash skills disable gmail-swiggy`, wait one cron tick, run `slashcash sync --full` again, and assert no new rows were ingested. Run `slashcash stop` and assert a clean shutdown with no orphan `gws` children. Re-run `slashcash onboard` and assert it's a fast no-op.

As with Phase 1, every assertion failure fails the gate and artefacts are uploaded.

## How this gate is enforced

The phase-complete PR runs the appropriate `e2e:phase-N` script in CI on a macOS runner that is configured to match the scenario's preconditions. For Phase 2 specifically, the Google test account's credentials live in a CI secret that is mounted into the runner as a `gws` credentials file; under no circumstances do real end-user credentials go near the test path. No deploy, no tag and no npm publish happens unless the E2E script is green.

In addition to CI, every phase ends with a **manual dogfood run** on the primary maintainer's personal machine. The scenarios above are the minimum; the dogfood run includes whatever ad-hoc probing exposes regressions that automation missed. This is the same practice openclaw follows and is deliberately kept in the gate.

## What is explicitly out of scope for Phase 1/2 testing

We are not setting up a cross-platform matrix in v1 (macOS only — see ADR-008). We are not exercising multi-user flows (single-user — see ADR-005). We are not running long-duration soak tests. We are not load-testing analytics against a large transaction corpus; the fixture is representative of a real one-person Swiggy history. All of these become relevant once the product ships and a v2 roadmap takes shape.
