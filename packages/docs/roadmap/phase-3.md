# Phase 3 — Onboarding, progress and error UX

> *Goal: a first-time user runs `slashcash onboard` and is walked, step by step, from a blank machine to a green system. They see what's happening at every moment, they can re-run safely, and when something goes wrong they get a one-line symptom, a one-line cause, and the one command that fixes it. The flow looks and feels like `../openclaw setup --wizard`, scaled down to our smaller surface.*

Phase 3 closes the user-facing gaps catalogued in [`audit-phase-1-2.md`](./audit-phase-1-2.md). It does not add new product surface; everything in this phase makes the existing Phase 2 surface usable on a real first-time machine. After Phase 3, the next time a maintainer or early user runs onboard from scratch, the experience is the one Phase 2 W1 promised on paper.

**Standing conventions.** Same as Phase 1 and 2 — pull patterns from `../openclaw`. The pieces most directly informed by openclaw here are: the wizard step pipeline (`openclaw:src/commands/onboard.ts` and the `setup --wizard` flow in `openclaw:src/cli/program/register.setup.ts`), the prompt helpers (`openclaw:src/cli/prompt.ts` — readline-based, no heavy dep), the per-step progress reporter shape (`openclaw:src/cli/progress.ts`, but adopt only the *shape*; we will not pull in `@clack/prompts` or `osc-progress`), the doctor check/repair registry (`openclaw:src/cli/program/register.maintenance.ts` family), and the closed-error-union pattern for shelled-out tools. Adopt the patterns; do not copy code.

The phase is not done until the Phase 3 end-to-end scenario in [`../reference/testing.md`](../reference/testing.md) passes from a fully clean machine, and the Phase 1 and Phase 2 scenarios still pass unchanged.

## Success criteria

1. `slashcash onboard` on a clean macOS machine walks through every step interactively. The user sees a progress line per step, model download progress in real time (parsed where parseable, raw stream where not), and a single end-of-flow summary.
2. `slashcash onboard` re-run on a finished machine completes in under one second and prints "everything is already in place" with no destructive operations.
3. Cancelling onboard with Ctrl-C at any step leaves the machine in a state that `slashcash doctor --fix` can finish without re-prompting for previously answered questions.
4. The user is asked exactly one onboarding question (the chat model). The default is `gemma3n:e4b`; one or two alternatives are listed and validated before being written to `config.json`.
5. `slashcash doctor` understands and surfaces the `gws` `invalid_client`, `access_denied` and `redirect_uri_mismatch` failure modes. The error message is a single block: symptom line, cause line, fix line, optional docs link. No raw JSON is ever printed to the user.
6. `slashcash doctor --quick` and `slashcash doctor --json` exist, behave per `architecture.md` § "Failure modes", and are documented in `reference/cli.md`.
7. The cron worker registers and deregisters jobs from the skill manifest; toggling a skill via `slashcash skills enable/disable` takes effect on the next cron tick without a process restart, or fails loudly if it can't.
8. The leak items from `audit-phase-1-2.md` (Phase 1 leftovers) are removed and a smell test prevents their return.

A demo at end of phase: a maintainer wipes their machine, runs `npm i -g slashcash`, runs `slashcash onboard`, and a small audience watches each step report start/done with elapsed time, including a live `ollama pull` progress bar; the maintainer kills the wizard mid-way through the model pull, runs `slashcash doctor --fix`, and the system finishes the pull and lands on green.

## Workstreams overview

Sizing as before (S ≤1 day, M 2–4 days, L ~1 week).

1. **W0 — Phase 1/2 leak cleanup (S).** Delete the leftover empty auth directories, remove the `user_google_tokens` reference, add the architectural smell test that prevents both regressions.
2. **W1 — Onboard wizard rewrite (M).** Rebuild `slashcash onboard` around a step pipeline (`detect / install / verify`), add the chat-model question, add the progress reporter, make every step idempotent, gate the `--skip-*` flags behind `SLASHCASH_E2E=1`.
3. **W2 — gws error classification and recovery (S).** Wrap `gws` invocations with a closed `GwsError` union; map the documented Google OAuth failure signatures to actionable messages; route them through the same one-line symptom/cause/fix format used by doctor.
4. **W3 — Doctor flags and standardised error format (S).** Land `--quick` and `--json`, normalise the check shape, normalise every CLI-surface error string on the symptom/cause/fix pattern.
5. **W4 — Skill-driven cron registry (S).** Make `packages/tasks/src/runtime/jobRegistry.ts` and `packages/cli/src/start/cron.ts` enumerate the manifest's `jobs` array; teach `skills enable/disable` to publish a registry-change event the cron loop picks up.
6. **W5 — Reference-doc rewrite (S).** Update `reference/cli.md`, `reference/config.md`, `reference/decisions.md` to match the new onboard, doctor and skills behaviour. Add ADR-018 (onboarding question scope) and update ADR-011 with the recovery surface.

## W0 — Phase 1/2 leak cleanup

Three concrete deletions and one new test. Delete the empty `apps/main/app/(auth)/login/`, `apps/main/app/(auth)/register/` and `apps/main/app/auth/callback/` directories. Remove the `user_google_tokens` reference in `packages/database/src/queries/operations/emailSync.ts` (the table is already gone from the schema; this is a string the query layer carries that no longer compiles against any column).

Add `packages/e2e-tests/architecture-smells.test.ts` (named the same as openclaw's for findability) with three checks: forbidden directories under `apps/main/app/`, forbidden imports in any `packages/**/*.ts` file (the Phase 1 W1 list), and forbidden table/column references in any query file (`user_google_tokens`, `token_access_logs`, `auth.users`). The test runs in CI on every PR.

Acceptance is `pnpm test architecture-smells` green on a fresh checkout, and `find apps/main/app/auth apps/main/app/\(auth\)` finding nothing.

## W1 — Onboard wizard rewrite

A new internal module under `packages/cli/src/onboard/` defines a `Step` type and a `Pipeline` runner. A `Step` looks like:

```ts
type Step = {
  id: string;                          // stable id, used by doctor and tests
  label: string;                       // user-facing one-liner
  detect(ctx: Ctx): Promise<DetectResult>;   // is this step already done?
  install(ctx: Ctx, p: Progress): Promise<void>;  // do the work
  verify(ctx: Ctx): Promise<void>;     // post-install sanity check
};
```

Steps are pure data; the runner orchestrates them. For each step the runner prints a header, calls `detect`, and either prints "already done" and skips, or calls `install` (passing a `Progress` that owns the live status line and elapsed timer) and then `verify`. Failures from `verify` raise the standardised `OnboardError`, which carries a symptom/cause/fix triple and a doctor-step id the user can rerun.

Steps for Phase 3, in order: `homebrew`, `model-question` (the only interactive step), `ollama-install`, `ollama-service`, `ollama-pull`, `gws-install`, `gws-auth`, `state-dir`, `db-migrate`, `bundled-skills`, `final-summary`. The `model-question` step is the only one that asks the user anything; everything else is detect-or-install. The default model is `gemma3n:e4b`; alternatives offered are `gemma3:4b` (smaller, faster), `qwen2.5:7b` (larger, slower, better quality). The user's choice is written to `config.json` before the `ollama-pull` step reads it.

The progress reporter is a tiny module under `packages/cli/src/cli/progress.ts`. It owns the active line on stderr, supports `start(label)` / `update(line)` / `done(elapsed)` / `fail(error)`, and degrades gracefully when stderr is not a TTY (it prints one line per update with a 250ms throttle so logs in CI don't get unreadable). It does not depend on `@clack/prompts`, `ora`, or `osc-progress` — those are openclaw choices we don't need at our scale; a few dozen lines of plain code do the job.

The chat-model prompt uses a tiny readline-based helper at `packages/cli/src/cli/prompt.ts`, modelled on `openclaw:src/cli/prompt.ts`. No new dependencies. The prompt honours `--yes` (accept default for everything), `--non-interactive` (fail loudly if anything would prompt), and `SLASHCASH_E2E=1` (auto-default and skip every step that would touch the network or shell out to Homebrew).

Idempotency is the responsibility of each step's `detect`. `homebrew.detect` returns done if `brew --version` succeeds. `ollama-install.detect` returns done if `ollama --version` succeeds. `ollama-service.detect` returns done if the configured `ollamaBaseUrl` answers `/api/tags` within 200ms. `ollama-pull.detect` returns done if `ollama list` includes the configured model. `gws-install.detect` returns done if `gws --version` succeeds. `gws-auth.detect` returns done if `gws auth status --format json` returns ok. `state-dir.detect` returns done if `~/.slashcash/` exists with the right subdirs. `db-migrate.detect` returns done if the schema's current migration matches the on-disk migration version. `bundled-skills.detect` returns done if every bundled skill is present in `~/.slashcash/skills/` with a matching `manifest.json`.

Cancellation is a SIGINT handler installed by the runner. On Ctrl-C: stop the active step's progress line, write a one-line "cancelled at step <id>; run `slashcash doctor --fix` to resume" message, and exit non-zero. Each step's `install` is responsible for being cancel-safe; for `ollama-pull` that means letting Ollama persist the partial layers it has and not deleting them.

The `--skip-external` and `--skip-auth` flags continue to exist for the E2E harness but only when `SLASHCASH_E2E=1` is set. From the user's `--help` they disappear.

Acceptance: a clean run completes within budget; a re-run completes in under a second; killing the wizard during `ollama-pull` leaves a partial pull on disk and `slashcash doctor --fix` finishes it; `slashcash onboard --non-interactive` on a missing-prereqs machine fails fast with a single error block; `SLASHCASH_E2E=1 slashcash onboard` runs the same pipeline without touching the network.

## W2 — gws error classification and recovery

A small wrapper at `packages/tasks/src/utils/gws-errors.ts` classifies stderr from `gws auth login`, `gws auth status` and `gws messages list` against a closed `GwsErrorCode` union: `binary-missing`, `not-authenticated`, `auth-invalid-client`, `auth-access-denied`, `auth-redirect-uri-mismatch`, `auth-expired`, `quota-exceeded`, `rate-limited`, `unknown`. Each code is paired with a `GwsError` object that carries `{ code, symptom, cause, fix, docsUrl }`.

The classifier reads stderr, looks for known signatures (`invalid_client`, `access_denied`, `redirect_uri_mismatch`, `429`, `RESOURCE_EXHAUSTED`, etc.), and returns the matching `GwsError`. Anything that doesn't match falls through to `unknown` with the raw stderr preserved as `cause` (truncated to 200 chars) and `fix` set to a generic "see `slashcash logs --filter gws`" pointer.

The CLI surface — `slashcash sync`, `slashcash doctor`, `slashcash onboard` — never prints raw JSON or stderr from `gws`. All three import the wrapper and render `GwsError` through the standardised error block format from W3. Doctor exposes a check `gws-auth` whose `--fix` for `auth-invalid-client` runs `brew reinstall googleworkspace/tap/gws` after asking for confirmation, then re-runs `gws auth status`; for `not-authenticated` it runs `gws auth login` interactively; for the others it prints the diagnostic and exits with the same code.

Per ADR-004 we still don't ship our own Google OAuth client. ADR-011 gets a note: "the recovery flow lives in W2 of Phase 3; if upstream `gws` distribution moves, update both the `GWS_BREW_FORMULA` constant and the `auth-invalid-client.fix` string in the same PR."

Acceptance: feeding the recorded `invalid_client` JSON from `audit-phase-1-2.md` into the classifier returns `GwsErrorCode.AuthInvalidClient`. Running `slashcash doctor` against a machine with a broken `gws` install prints exactly the three-line block, never the raw JSON. Running `slashcash doctor --fix` on the same machine prompts for the reinstall and finishes green if the user agrees.

## W3 — Doctor flags and standardised error format

`slashcash doctor` adopts a structured `Check` shape: `{ id: string; label: string; category: "filesystem" | "network" | "binary" | "schema"; run(ctx): Promise<CheckResult>; fix?(ctx): Promise<FixResult>; }`. The runner collects results, prints them in TTY-friendly format, and exits with 0 if all green or 1 if any red.

Two new flags. `--quick` runs only `category === "filesystem"` checks (no network probes, no Ollama ping, no `gws auth status`). `--json` prints `[{ id, label, status, durationMs, evidence?, fix? }]` to stdout instead of TTY-formatted output and never prompts; `--fix` is incompatible with `--json` (errors out with a hint to run them in two steps).

The standardised error block, used everywhere a CLI surface ever prints an error, is three lines plus an optional fourth:

```
error[<area>]: <symptom>
  cause: <cause>
  fix:   <one command or short instruction>
  docs:  <url>            (optional, only when relevant)
```

Areas: `auth`, `network`, `binary`, `schema`, `config`, `filesystem`, `runtime`, `internal`. The format is enforced by a `formatCliError(err)` helper that every entrypoint must use; an integration test in Phase 4 W3 asserts the format by parsing it back.

Acceptance: every existing thrown `Error` reachable from a CLI command is replaced by an `OnboardError`, `GwsError`, `DoctorError` or `RuntimeError` (the four union types live under `packages/cli/src/errors/`); `slashcash doctor --json` round-trips through `JSON.parse` cleanly; `slashcash doctor --quick` returns in under 200ms on a healthy machine.

## W4 — Skill-driven cron registry

The skill manifest schema gets a `jobs` array (already documented in `reference/skills.md`; the runtime didn't honour it). At `slashcash start`, the cron registry reads the union of `jobs` from every enabled skill and registers each one with `node-cron`. Each registration tracks `{ skillId, jobId, cron, handler, mutexKey }`.

`skills enable <id>` and `skills disable <id>` write to `config.json` and publish a `skills:changed` event on a small in-process bus. The cron loop subscribes; on `skills:changed` it diffs the previous and current registration sets and adds/removes only what changed. This makes the "no restart needed" promise from Phase 2 W7 actually true.

A new file `packages/cli/src/skills/jobs.ts` is the single registration point — both `start` (cold registration) and the `skills:changed` subscriber call it. The mutex from Phase 2 W3 is keyed on `mutexKey` from the manifest so two distinct skills can run jobs concurrently while two jobs of the same skill (or two ticks of the same job) cannot.

Acceptance: with two enabled skills declaring different `mutexKey`s, both jobs run concurrently when their schedules align; with one skill declaring two jobs that share a `mutexKey`, one is skipped per tick; `skills disable gmail-swiggy` followed within a tick by a manual `slashcash sync` returns "skill is disabled" as today; `skills enable` with the worker running causes the next scheduled tick to fire without a restart.

## W5 — Reference-doc rewrite

Rewrites in place. `reference/cli.md` documents the new `--quick` / `--json` / `--non-interactive` / `--yes` surface, the actual visible flags on `onboard` (no `--skip-*`), and the standardised error block format. `reference/config.md` documents the new `chatModel` config key (set during `model-question`) and the manifest `jobs` array semantics. `reference/decisions.md` gains:

- **ADR-018 — Single onboarding question.** We ask the chat-model question only; everything else has a sane default. Why: every additional prompt costs a real fraction of users; the chat-model choice is the only one with a meaningful trade-off (download size and quality). Rejected: asking for port (we detect conflict and offer `--port` instead), asking for sync schedule (every 15m is good for everyone, change in `config.json` if you care), asking which skills to enable (only one skill ships in v1).
- **ADR-019 — CLI error block format.** Symptom / cause / fix / optional docs link, in that order, no exceptions. Every CLI-facing error class implements this. Why: openclaw demonstrates this is what makes a CLI feel debuggable. We borrow the format and the discipline of refusing to print anything else.

Acceptance: `slashcash --help` for every command renders a section that matches `reference/cli.md` exactly (an integration test in Phase 4 W3 enforces this).

## Sequencing and rough schedule

W0 lands first and unblocks the smell test. W1 is the largest single piece and runs in parallel with W2 and W3 (different files, different owners if applicable). W4 lands after W1 because it consumes the new error format. W5 runs continuously across the phase and gates the merge.

A reasonable single-engineer schedule is one week: W0 plus the W1 step pipeline scaffolding on day 1; the rest of W1 plus W2 on days 2–3; W3 on day 4; W4 on day 5; W5 polish and the Phase 3 E2E scenario alongside.

## End-to-end verification

Add a Phase 3 scenario to `reference/testing.md` and `packages/e2e-tests/scenarios/phase-3.ts` with three independent flows:

1. **Cold install flow.** Wipe `~/.slashcash/`, ensure Ollama and `gws` are not installed, run `slashcash onboard`, assert the wizard hits every documented step, asks the model question with default acceptance, completes, and `slashcash doctor` is green afterwards. Asserts on observable output (the symptom/cause/fix block format) not on internal state.
2. **Idempotent re-run flow.** With everything from flow 1 in place, re-run `slashcash onboard` and assert it completes in under one second and emits the "already in place" summary with no destructive operations.
3. **Cancellation + recovery flow.** Run `slashcash onboard` in a child process, kill it with SIGINT during `ollama-pull` (detected by stdout match), assert the wizard exits non-zero with the cancellation message, then run `slashcash doctor --fix` and assert it finishes the pull and lands green.

Plus the Phase 1 and Phase 2 scenarios re-run unchanged. None of them are allowed to regress.

## Exit gate

Phase 3 is done when: every success criterion above is met; the three Phase 3 E2E flows pass; the Phase 1 and Phase 2 E2E scenarios still pass; the architectural smell test from W0 is green and gating CI; `reference/cli.md` matches actual `--help` output; ADR-018 and ADR-019 are written; the `audit-phase-1-2.md` items tagged "fix in Phase 3" are checked off in that file.

## Deferred to later phases

Full unit + integration test pyramid (Phase 4). Per-package vitest setup, snapshot tests for analytics, Playwright UI smoke tests, CI matrix (Phase 4). Release pipeline, npm publish with provenance, post-publish smoke test, standalone-bundle verification (Phase 5). Evals as a CI quality gate (Phase 5). `slashcash logs` reader and log rotation (Phase 5). Performance budgets and observability (Phase 5).
