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

Steps for Phase 3, in order: `homebrew`, `model-question` (the only interactive question step), `ollama-install`, `ollama-service`, `ollama-pull`, `gcloud-install`, `gcloud-auth`, `gws-install`, `gws-setup`, `gws-login`, `state-dir`, `db-migrate`, `bundled-skills`, `final-summary`. The `model-question` step is the only one that asks the user a _question_; `gcloud-auth` and `gws-login` **delegate to the terminal** for browser-based consent but do not ask the user any questions in our own prompt surface. Everything else is detect-or-install. The default model is `gemma3n:e4b`; alternatives offered are `gemma3:4b` (smaller, faster), `qwen2.5:7b` (larger, slower, better quality). The user's choice is written to `config.json` before the `ollama-pull` step reads it.

The Google auth sequence (`gcloud-install` → `gcloud-auth` → `gws-install` → `gws-setup` → `gws-login`) implements ADR-022. `gcloud-install` shells `brew install --cask google-cloud-sdk`. `gcloud-auth` delegates to `gcloud auth login`. `gws-setup` runs `gws auth setup`, which reuses the active gcloud credentials to create/select a Google Cloud project, enable the Gmail API, create a Desktop-type OAuth client, add the signed-in account as a test user, and write `~/.config/gws/client_secret.json`. `gws-login` runs `gws auth login --scopes gmail.readonly`. Splitting `gws-setup` and `gws-login` matters for idempotency: if a previous onboard failed at the login consent, re-running lets us skip the expensive project/client creation and go straight to consent.

### Privacy disclosure inside the wizard

Per vision principle 11 ("trust is surfaced, not buried"), the wizard prints plain-language privacy facts at four moments. The copy lives in **one** file, `packages/cli/src/privacy/copy.ts`, exported as named constants so the wizard, the pre-consent hooks and the `slashcash privacy` command (see W5) all render the same text. Tests in `packages/cli/test/privacy.spec.ts` snapshot each constant so changes to user-facing trust claims show up in review diffs.

1. **Top-of-onboard banner.** Printed after `model-question`, before any shell-out or network call. Six facts, one line each, no marketing:

   ```text
   slashcash runs fully on your machine. Before we touch anything, the facts:
     • Your Gmail token lives in the Google Cloud project gcloud is about to create in YOUR account. We never see it.
     • Every email, PDF and analytics row stays under ~/.slashcash on this disk.
     • PDFs are parsed by a local model (gemma3n:e4b via Ollama). No OpenAI, Anthropic or Mistral calls.
     • The dashboard binds to 127.0.0.1. Nothing from the internet can reach it.
     • No telemetry. The only outbound calls are Gmail fetches you authorise through gws.
     • This CLI is published to npm with provenance and an SBOM. Re-read this any time with `slashcash privacy`.
   ```

2. **Right before `gcloud-auth.install` opens a browser.** One line, printed by the step's `install` before it execs `gcloud auth login`:

   ```text
   Opening your browser for Google sign-in. gcloud needs your account to create a
   Google Cloud project in YOUR account — the Gmail OAuth client and the refresh
   token will live there, not on our servers.
   ```

3. **Right before `gws-login.install` opens a browser.** One line, printed before it execs `gws auth login --scopes gmail.readonly`:

   ```text
   Opening your browser for Gmail consent. You'll see a "Google hasn't verified
   this app" screen — click Advanced → Continue. The app is the one gws auth setup
   just created in your own Cloud project. The only scope requested is
   gmail.readonly.
   ```

4. **Final-summary block.** Printed by `final-summary.install` after every step is green. Restates what now exists and what does not exist anywhere else:

   ```text
   On this machine now:
     ~/.slashcash/db.sqlite           your local database
     ~/.slashcash/attachments/        downloaded PDFs
     ~/.config/gws/client_secret.json your OAuth client (yours, not ours)
     ~/.config/gws/<token>            your Gmail refresh token (yours, not ours)

   On our servers: nothing. slashcash has no backend.
   From here on, the only outbound calls slashcash makes are Gmail API calls
   you authorised through gws. Run `slashcash privacy` to re-read this.
   ```

The banner honours `--non-interactive` and `--yes` (it still prints; it does not prompt) and is suppressed under `SLASHCASH_E2E=1` so test logs stay clean. None of the four moments ask for acknowledgement — this audience hates "I understand" checkboxes (see vision → "Target audience for v1"). They are there to earn trust, not to gate it.

The progress reporter is a tiny module under `packages/cli/src/cli/progress.ts`. It owns the active line on stderr, supports `start(label)` / `update(line)` / `done(elapsed)` / `fail(error)`, and degrades gracefully when stderr is not a TTY (it prints one line per update with a 250ms throttle so logs in CI don't get unreadable). It does not depend on `@clack/prompts`, `ora`, or `osc-progress` — those are openclaw choices we don't need at our scale; a few dozen lines of plain code do the job.

The chat-model prompt uses a tiny readline-based helper at `packages/cli/src/cli/prompt.ts`, modelled on `openclaw:src/cli/prompt.ts`. No new dependencies. The prompt honours `--yes` (accept default for everything), `--non-interactive` (fail loudly if anything would prompt), and `SLASHCASH_E2E=1` (auto-default and skip every step that would touch the network or shell out to Homebrew).

Idempotency is the responsibility of each step's `detect`. `homebrew.detect` returns done if `brew --version` succeeds. `ollama-install.detect` returns done if `ollama --version` succeeds. `ollama-service.detect` returns done if the configured `ollamaBaseUrl` answers `/api/tags` within 200ms. `ollama-pull.detect` returns done if `ollama list` includes the configured model. `gcloud-install.detect` returns done if `gcloud --version` succeeds. `gcloud-auth.detect` returns done if `gcloud auth list --format=json` reports an active account. `gws-install.detect` returns done if `gws --version` succeeds. `gws-setup.detect` returns done if `~/.config/gws/client_secret.json` exists **and** the resolved `GOOGLE_WORKSPACE_PROJECT_ID` has the Gmail API enabled (`gcloud services list --enabled --filter gmail.googleapis.com`). `gws-login.detect` returns done if `gws auth status --format json` returns ok. `state-dir.detect` returns done if `~/.slashcash/` exists with the right subdirs. `db-migrate.detect` returns done if the schema's current migration matches the on-disk migration version. `bundled-skills.detect` returns done if every bundled skill is present in `~/.slashcash/skills/` with a matching `manifest.json`.

Cancellation is a SIGINT handler installed by the runner. On Ctrl-C: stop the active step's progress line, write a one-line "cancelled at step <id>; run `slashcash doctor --fix` to resume" message, and exit non-zero. Each step's `install` is responsible for being cancel-safe; for `ollama-pull` that means letting Ollama persist the partial layers it has and not deleting them.

The `--skip-external` and `--skip-auth` flags continue to exist for the E2E harness but only when `SLASHCASH_E2E=1` is set. From the user's `--help` they disappear.

Acceptance: a clean run completes within budget; a re-run completes in under a second; killing the wizard during `ollama-pull` leaves a partial pull on disk and `slashcash doctor --fix` finishes it; `slashcash onboard --non-interactive` on a missing-prereqs machine fails fast with a single error block; `SLASHCASH_E2E=1 slashcash onboard` runs the same pipeline without touching the network.

## W2 — gws error classification and recovery

A small wrapper at `packages/tasks/src/utils/gws-errors.ts` classifies stderr from `gws auth setup`, `gws auth login`, `gws auth status` and `gws messages list` against a closed `GwsErrorCode` union: `binary-missing`, `not-authenticated`, `auth-invalid-client`, `auth-access-denied`, `auth-redirect-uri-mismatch`, `auth-expired`, `api-not-enabled`, `gcloud-missing`, `gcloud-not-authenticated`, `quota-exceeded`, `rate-limited`, `unknown`. Each code is paired with a `GwsError` object that carries `{ code, symptom, cause, fix, docsUrl }`.

The classifier reads stderr, looks for known signatures (`invalid_client`, `access_denied`, `redirect_uri_mismatch`, `accessNotConfigured` / `has not been used in project` for the API-not-enabled case, `gcloud: command not found` or exit code 127 for `gcloud-missing`, `Reauthentication is needed` / empty `gcloud auth list` for `gcloud-not-authenticated`, `429`, `RESOURCE_EXHAUSTED`, etc.), and returns the matching `GwsError`. Anything that doesn't match falls through to `unknown` with the raw stderr preserved as `cause` (truncated to 200 chars) and `fix` set to a generic "see `slashcash logs --filter gws`" pointer.

The CLI surface — `slashcash sync`, `slashcash doctor`, `slashcash onboard` — never prints raw JSON or stderr from `gws` or `gcloud`. All three import the wrapper and render `GwsError` through the standardised error block format from W3. Doctor exposes a check `gws-auth` whose repair table is:

- `gcloud-missing` — fix is `brew install --cask google-cloud-sdk` (the cask name is recorded in ADR-011 alongside the gws formula).
- `gcloud-not-authenticated` — fix is `gcloud auth login`, rerunnable through `doctor --fix` as an interactive step.
- `binary-missing` (for `gws`) — fix is the `brew install` command from the `GWS_BREW_FORMULA` constant.
- `auth-invalid-client` — fix is `gws auth setup` (re-creates the OAuth client against the active gcloud project); only fall back to `brew reinstall <GWS_BREW_FORMULA>` if the upstream client template itself needs to be refreshed.
- `api-not-enabled` — fix is `gcloud services enable gmail.googleapis.com --project <id>` or re-running `gws auth setup` (which enables the API as a side effect).
- `not-authenticated` — fix is `gws auth login --scopes gmail.readonly` interactively.
- For the other codes, doctor prints the diagnostic and exits with the same code.

Per ADR-004 we still don't ship our own Google OAuth client; ADR-022 captures how we instead provision a per-user client via `gws auth setup` on top of the user's own gcloud. ADR-011 gets a note: "the recovery flow lives in W2 of Phase 3; if upstream `gws` distribution moves, update the `GWS_BREW_FORMULA` / `GCLOUD_BREW_CASK` constants and the `auth-invalid-client.fix` / `gcloud-missing.fix` strings in the same PR."

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

Rewrites in place. `reference/cli.md` documents the new `--quick` / `--json` / `--non-interactive` / `--yes` surface, the actual visible flags on `onboard` (no `--skip-*`), the standardised error block format, and the new `slashcash privacy` command. `reference/config.md` documents the new `chatModel` config key (set during `model-question`) and the manifest `jobs` array semantics. `reference/decisions.md` gains:

- **ADR-018 — Single onboarding question.** We ask the chat-model question only; everything else has a sane default. Why: every additional prompt costs a real fraction of users; the chat-model choice is the only one with a meaningful trade-off (download size and quality). Rejected: asking for port (we detect conflict and offer `--port` instead), asking for sync schedule (every 15m is good for everyone, change in `config.json` if you care), asking which skills to enable (only one skill ships in v1).
- **ADR-019 — CLI error block format.** Symptom / cause / fix / optional docs link, in that order, no exceptions. Every CLI-facing error class implements this. Why: openclaw demonstrates this is what makes a CLI feel debuggable. We borrow the format and the discipline of refusing to print anything else.
- **ADR-023 — Privacy disclosures surface at onboarding.** The privacy claims that make this product worth installing (local-only data, BYO Google Cloud project, no telemetry, loopback dashboard) are printed by the wizard at four moments — top-of-onboard banner, pre-`gcloud auth login` line, pre-`gws auth login` line, and final summary — and are reachable forever through `slashcash privacy`. The wizard does not gate on acknowledgement; trust is built by showing the facts at the moments the user is deciding whether to click Allow. Why: the developer audience (vision → "Target audience for v1") evaluates trust at the consent screen, not on a landing page. Rejected: a single upfront dump (they skim), legal "I accept" checkboxes (wrong product), printing only via a separate command (missed by the users who most need it). Copy lives in one file, `packages/cli/src/privacy/copy.ts`, so the banner and the standing command never drift.

`slashcash privacy` lands in this phase as part of W5. It has no flags, prints the same six-bullet banner the wizard prints (plus a pointer to the `reference/decisions.md` ADRs), and exits 0. Its CLI reference entry in `reference/cli.md` points readers at ADR-023 for the "why this exists" and at `reference/architecture.md` for the data-flow picture.

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

## Pending — hand to next agent

The Phase 3 step pipeline, single model prompt, `gws` error classification, `doctor --quick` / `--json`, skill-driven cron registry, and the `e2e:phase-3` fixture flow are implemented. What the repo still has not verified against a real machine:

- [x] **Prerequisite probe before writing the wizard.** Run `gws auth setup --help` on the current upstream build and record whether it exposes non-interactive flags for project name, scope list and test-user email. If it is fully interactive in non-TTY mode, implement a `gws-setup` step that inherits the TTY and lets the user answer the one or two prompts the upstream command asks. If it *is* scriptable, pass `--project`, `--scopes=gmail.readonly` (or whatever the real flag names are) from `config.json`. Record what you found in ADR-022 so the next agent does not re-probe.
  - Verified on 2026-04-17 against installed `gws 0.22.5`: `gws auth setup --help` exposes `--project <id>`, `--login`, and `--dry-run` only. It does not expose setup-time API/scope-list, readonly, service-list, or test-user email flags; guessed flags are rejected. `gws auth login --help` exposes `--scopes <scopes>`, so scope narrowing remains in `gws-login`. ADR-022 has the full probe transcript summary.
- [!] **Fallback path if `gws auth setup` is not scriptable enough.** Implement a scripted-gcloud alternative inside `gws-setup.install`: `gcloud projects create slashcash-<hash-of-home>`, `gcloud config set project`, `gcloud services enable gmail.googleapis.com`, then write `~/.config/gws/client_secret.json` from an OAuth client we either provision via the `gcloud alpha iap oauth-brands`/`oauth-clients` family (Web / Desktop client is the subtle bit — verify upstream) or by falling through to `gws auth setup` after the project is ready. Document which path actually works in ADR-022.
  - Blocked on real Google verification. Help probes verified `gcloud projects create`, `gcloud config set project`, and `gcloud services enable gmail.googleapis.com` syntax only. No live project was created. The `gcloud alpha iap oauth-*` command group was not installed and prompted to install `alpha`; no supported Desktop OAuth client + test-user + `client_secret.json` path was verified. ADR-022 now says not to code this fallback until it is exercised against a disposable account/project.
- [x] Pass `--brief --no-update-adc` to `gcloud auth login` and `--scopes gmail.readonly` to `gws auth login` so consent is single-scope and the post-login terminal spam is minimised.
  - Verified on 2026-04-17 against `gcloud 562.0.0`: `--update-adc=false` is rejected as an explicit argument to a boolean flag; `--no-update-adc` is the accepted spelling.
- [x] Implement the new ADR-022 steps in `packages/cli/src/onboard/run.ts`: `gcloud-install`, `gcloud-auth`, and split the existing `gws-auth` step into `gws-setup` (runs `gws auth setup` or the scripted-gcloud fallback) and `gws-login` (runs `gws auth login --scopes gmail.readonly`). Add the matching detect rules from W1.
- [x] Update the `GWS_BREW_FORMULA` constant to the current upstream value from the `gws` README (`googleworkspace-cli`) and add a sibling `GCLOUD_BREW_CASK = "google-cloud-sdk"` constant. Keep both in one file per ADR-011.
- [x] Extend the `GwsErrorCode` union with `api-not-enabled`, `gcloud-missing`, and `gcloud-not-authenticated`; wire the classifier signatures (`accessNotConfigured`, empty `gcloud auth list`, exit code 127) and the doctor repair table from W2.
- [!] Run a real blank-machine `slashcash onboard` end-to-end: Homebrew → Ollama install → `ollama pull` → gcloud install → `gcloud auth login` → gws install → `gws auth setup` → `gws auth login --scopes gmail.readonly` → state dir → DB migrate → bundled skill install.
  - Blocked in this pass: this development machine already has local gcloud/gws state and is not a clean macOS install. Requires a disposable clean machine plus test Google account/project.
  - Partial local coverage on 2026-04-17: ran `slashcash onboard --yes --skip-auth` with a temporary `SLASHCASH_HOME` and `SQLITE_DB_PATH`. It passed Homebrew/Ollama/gcloud/gws binary detection, Ollama service/model detection, state dir creation, DB migration, bundled skill install, and final summary without touching the real `~/.slashcash` or Google credentials. This also fixed a repo bug where `--skip-auth` did not actually skip the auth steps outside E2E.
- [!] Kill `slashcash onboard` mid-`ollama pull` **and** separately mid-`gws auth setup`, then confirm `slashcash doctor --fix` resumes cleanly in both cases.
  - Blocked in this pass: safe verification requires the same clean machine/test Google account. The repo-only E2E still covers dry-run idempotency and quick doctor JSON, but not live cancellation recovery.
- [!] Exercise real failure modes: `invalid_client`, `access_denied`, `redirect_uri_mismatch`, `accessNotConfigured` (disable Gmail API in the test project and run `slashcash sync`), `gcloud-missing` (uninstall gcloud), `gcloud-not-authenticated` (revoke gcloud creds). Confirm the standardised error block renders (no raw JSON) and `doctor --fix` proposes the right repair.
  - Blocked in this pass: these mutate or break real Google/gcloud/gws state and require a disposable account/project. The classifier fixtures remain repo-verified; the live Google failure modes are not marked done.
- [x] Strengthen exact `--help` output vs `reference/cli.md` parity (the current gate is the reference doc; a real parity test is a Phase 4 W2 item but Phase 3 can seed a lightweight assertion now).
  - Seeded lightweight Phase 3 E2E assertions for `onboard --help`, `doctor --help`, and `privacy --help`, including that E2E-only onboard skip flags stay hidden from normal help.
- [x] **Ship the privacy disclosures from W1 → "Privacy disclosure inside the wizard".** Land `packages/cli/src/privacy/copy.ts` as the single source of truth with four exported constants (`TOP_BANNER`, `PRE_GCLOUD_AUTH`, `PRE_GWS_LOGIN`, `FINAL_SUMMARY`). Wire `TOP_BANNER` into the onboard runner after `model-question`. Wire `PRE_GCLOUD_AUTH` and `PRE_GWS_LOGIN` into the matching step's `install` hook so each line prints immediately before the shell-out that opens the browser. Wire `FINAL_SUMMARY` into the final-summary step. Suppress all four under `SLASHCASH_E2E=1`; still print under `--yes` and `--non-interactive`. Snapshot-test each constant in `packages/cli/test/privacy.spec.ts` so changes to user-facing trust claims are visible in review.
- [x] **Ship `slashcash privacy`.** Register a new command in `packages/cli/src/cli/registry/` that imports the same constants and prints them. Document it in `reference/cli.md` (see W5). Add an E2E assertion to `packages/e2e-tests/scenarios/phase-3.ts` that `slashcash onboard` actually printed the banner (match on a stable phrase) and that `slashcash privacy` exits 0 with the same phrase.
- [x] **Write ADR-023 — Privacy disclosures surface at onboarding.** Use the rationale block from W5 above verbatim; link forward from vision principle 11 and backward from ADR-022 ("Revisit if" → add a bullet noting a verified shared client would change what the pre-`gws-login` line says).

Verification commands the next agent should rerun:

```bash
pnpm --filter slashcash typecheck
pnpm --filter slashcash test
pnpm e2e:phase-3
pnpm architecture-smells
git diff --check
```

## Deferred to later phases

Full unit + integration test pyramid (Phase 4). Per-package vitest setup, snapshot tests for analytics, Playwright UI smoke tests, CI matrix (Phase 4). Release pipeline, npm publish with provenance, post-publish smoke test, standalone-bundle verification (Phase 5). Evals as a CI quality gate (Phase 5). `slashcash logs` reader and log rotation (Phase 5). Performance budgets and observability (Phase 5).
