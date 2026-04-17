# Phase 5 — Release, packaging, observability, docs polish

> *Goal: `slashcash` is published on npm, a clean macOS install of the published tarball boots cleanly through `onboard`, evals run as a CI quality gate with a real threshold, the `logs` command is usable, and the public docs render the shipped state. After Phase 5 the project graduates from "works on the maintainer's machine" to "works on a stranger's machine, audibly."*

Phase 5 closes the production-readiness gaps catalogued in [`audit-phase-1-2.md`](./audit-phase-1-2.md) — the release pipeline, evals as a gate, log ergonomics, doc drift — and lands the small set of observability and performance probes that turn the post-publish bug reports from "the app feels slow on my machine" into "the app spent 2.3s in the cron tick on my machine and here is the log line that says so."

**Standing conventions.** Same as before — `../openclaw` is the reference shape. Most directly relevant here: the npm publish flow with provenance attestation (`openclaw:test/openclaw-npm-release-check.test.ts`, `openclaw-prepack.test.ts`, `openclaw-npm-postpublish-verify.test.ts`), the standalone-bundle pack-and-run smoke test, the daily-log rotation pattern, the `logs` command with filter/follow ergonomics, and the appcast / version-fast-path machinery for in-place CLI updates (we adopt the version-check ergonomics; we do not ship an auto-updater in v1). Adopt the patterns; do not copy code.

The phase is not done until the Phase 5 end-to-end scenario in [`../reference/testing.md`](../reference/testing.md) passes from a clean macOS machine using the *published* tarball — not the workspace dev binary — and Phases 1–4 still pass on every push.

## Success criteria

1. `npm i -g slashcash` from the published package on a clean macOS machine, followed by `slashcash onboard`, produces a working dashboard. The flow uses the bundled standalone Next.js tree, not a workspace build.
2. The release workflow tags, builds, signs and publishes to npm with a provenance attestation; a post-publish smoke test runs against the published tarball and rolls back the dist-tag if it fails.
3. Every release publishes a checksum and a SBOM; the README documents how to verify.
4. The eval harness runs in CI on every push; the threshold from ADR-012 is filled in (no longer placeholder) and merges below threshold fail.
5. `slashcash logs` reads the rotated structured logs from `~/.slashcash/logs/` with `--tail`, `--follow`, `--filter <area>`, `--since <duration>`, and `--json`; output respects the standardised CLI error block format.
6. Logs themselves: every log line is a `LogEvent` (validated on the way out), files rotate daily and at a size cap, the directory has a documented retention policy.
7. Performance budgets are recorded for the four hot paths — cold CLI, doctor, dashboard SSR, assistant first token — and asserted in CI on the macOS runner. Regressions surface as a PR comment with the budget delta.
8. `reference/cli.md`, `reference/config.md`, `reference/skills.md`, `reference/env-vars.md`, `reference/decisions.md`, `architecture.md`, `current-state.md` and the README all match the shipped state. A doc-drift smell test (Phase 4 W2) is green.
9. The marketing site at `slash.cash` points at the CLI; the hosted dashboard at `app.slash.cash` is decommissioned (DNS + S3 cleanup tracked in a separate runbook outside this repo).

A demo at end of phase: the maintainer wipes their machine, runs `npm i -g slashcash@latest`, runs `slashcash onboard`, runs `slashcash logs --follow --filter ingest`, watches a real cron tick stream through, opens the dashboard, asks the assistant a question, and the entire session is recorded as the release-announcement screencast.

## Workstreams overview

Sizing as before. Phase 5 is mixed S/M with one L (the release pipeline if it's the first time we set up provenance and post-publish rollback).

1. **W1 — Release pipeline, npm publish, provenance, post-publish smoke (L).** GitHub Actions workflow that tags, builds the standalone bundle, packs the CLI, publishes with provenance, runs the published tarball through the Phase 3 onboard scenario, and rolls back the dist-tag on failure.
2. **W2 — Standalone bundle hardening (M).** Make `bundle-app.mjs` reproducible, smaller, and verified. Add the dual-mode `start` detection test. Add the post-pack architecture test (no dev-only files in the tarball, every binary is on `PATH`).
3. **W3 — Evals as a quality gate (S).** Wire `packages/evals` into CI, fill in ADR-012 with a real number, fail merges below threshold, surface the eval delta as a PR comment.
4. **W4 — Logs, log rotation, the `logs` command (M).** Define `LogEvent`, replace ad-hoc `console.log`/`console.error` calls in long-lived paths with the logger, daily + size-cap rotation, and a usable `slashcash logs` reader.
5. **W5 — Performance budgets and probes (S).** Record the four budgets, assert them in CI, add lightweight in-process timing probes that emit structured timing events into the logs.
6. **W6 — Docs polish, drift gate, version-check ergonomics (S).** Update every reference doc to the shipped state; add the doc-drift smell test from Phase 4 W2; add a version-check probe (`slashcash --version` reports "you have X, latest on npm is Y" without phoning home unless the user opts in via `slashcash config set updates.checkOnVersion true`).
7. **W7 — Decommission the hosted surface (S).** A short workstream that closes ADR-013: kill the CI deploys to the hosted app, archive the deployment configs (`render.yaml`, anything Vercel), confirm DNS is moved to point `slash.cash` at the CLI landing page, and add a decommission entry to `current-state.md`.

## W1 — Release pipeline, npm publish, provenance, post-publish smoke

A new workflow `.github/workflows/release.yml` triggers on a `vX.Y.Z` git tag pushed to `main` (after `pr.yml` has been green). The workflow:

1. Checks out the repo at the tag, validates the tag matches `packages/cli/package.json`'s version.
2. Runs the full Phase 4 pyramid (`pr.yml` jobs) one more time as a release-gate; a single red job stops the release.
3. Runs `pnpm --filter slashcash bundle:app` to build the standalone Next.js tree into `packages/cli/dist/app/`.
4. Runs a prepack architecture test (W2) that asserts the tarball contains exactly the expected file set, no test fixtures, no dev dependencies pulled into the bundle, no `.env*` files, no maps for prod chunks unless we choose to ship them.
5. Runs `npm publish --access public --provenance` from inside `packages/cli/`, with `NPM_TOKEN` from the secret store.
6. Runs the post-publish smoke test on a fresh GitHub macOS runner: `npm i -g slashcash@<version>`, then a non-interactive `slashcash onboard --yes` against a stub Ollama and a fixture-fed `gws`, then a dashboard healthz probe, then `slashcash stop`. Non-interactive so we don't hold the runner waiting for prompts.
7. On post-publish smoke failure: `npm dist-tag rm slashcash latest` is *not* automatic (npm doesn't allow unpublishing once `>72h` and we don't want hidden surprises); instead we promote the previous version back to `latest`, open a hotfix issue, and notify the maintainer.

Provenance attestation is enabled via `--provenance` (npm's built-in flow) so consumers can verify the package was built from this repo at this commit. Checksums (`shasum -a 256`) for the published tarball are uploaded as a GitHub release artefact. A SBOM is generated by `cyclonedx-npm` (or the SBOM tool we adopt) and uploaded alongside.

Acceptance: a tag push lands a published version with provenance and SBOM artefacts; the post-publish smoke test runs and gates the dist-tag promotion; a deliberately-broken release candidate fails before the dist-tag flips.

## W2 — Standalone bundle hardening

The current `packages/cli/scripts/bundle-app.mjs` works but is a sharp edge. Phase 5 W2 makes it boring.

- Reproducibility: pin every input (Next.js version, sharp version, every transitive used at build time), pin Node to the version recorded in `engines`, set `SOURCE_DATE_EPOCH` to the commit time so output is byte-identical between two runs of the same commit.
- Size: a `bundle:check` script asserts the produced tree is below an agreed budget (initial: 350MB unpacked for the current Next standalone tree after excluding `.next/cache`); regressions fail CI.
- Verification: a post-bundle test boots `slashcash start` against the produced bundle, asserts the dual-mode detection picks "tarball mode", asserts the dashboard answers, asserts no dev-only files (`tsx`, source maps for non-prod chunks) shipped.
- Native deps: `better-sqlite3` is the only native dep; CI verifies the prebuild for Node 20 + 22 macOS arm64 + x64 is downloadable at install time. A `postinstall` no-op compile fallback is documented.
- Files manifest: the `files` field in `package.json` is the source of truth; the architecture test asserts every shipped file matches an entry and nothing else creeps in.

Acceptance: two clean builds at the same commit produce identical tarball checksums; the budget is asserted; the dual-mode boot is exercised by a test that lives in `packages/e2e-tests/scenarios/phase-5.ts`.

## W3 — Evals as a quality gate

A new workflow job `evals` runs `packages/evals` against the local provider in CI on every push. It uses a deterministic eval set (the existing extraction set + the assistant Q&A set) and produces two scores: extraction accuracy and Q&A pass-rate. ADR-012's placeholder threshold ("ninety percent of baseline") is replaced with a number derived from a one-time prototype run on real data; the chosen number is recorded in ADR-012 with the date and the prototype data hash.

Below threshold = the job fails = the merge is blocked. A small bot comments on the PR with the per-test breakdown. Updating the threshold is an explicit ADR edit, not a config change. The eval set itself is versioned; changing inputs requires regenerating fixtures (W8 of Phase 4 owns this discipline).

Acceptance: the eval CI job is required on `main`; a PR that intentionally degrades the assistant's prompt drops the eval score and fails the job within budget; raising the model's prompt back to baseline turns the job green.

## W4 — Logs, log rotation, the `logs` command

A single `LogEvent` schema lives at `packages/cli/src/runtime/log-event.ts`:

```ts
type LogEvent = {
  ts: number;            // ms since epoch
  level: "debug" | "info" | "warn" | "error";
  area: "cli" | "onboard" | "doctor" | "ingest" | "cron" | "ai" | "http" | "db" | "skills";
  msg: string;
  // optional context (small flat shape; nested objects flattened)
  cmd?: string;
  step?: string;
  durationMs?: number;
  errCode?: string;
  // ...add fields as we need them, but no `unknown` blobs
};
```

A logger module wraps this and writes one JSON line per event into `~/.slashcash/logs/<YYYY-MM-DD>.log`. Rotation: a new file at midnight local time, plus an in-process flip when the current file passes 10MB. Retention: keep 14 days, delete older files on the next write. Validation: every event is parsed against the schema before it's written; failures fall back to a one-line `{"level":"error","area":"internal","msg":"log validation failed"}` so we never lose the signal that the logger broke.

Existing `console.log` and `console.error` calls in long-lived paths (`packages/cli/src/onboard/`, `packages/cli/src/doctor/`, `packages/cli/src/start/`, `packages/tasks/src/runtime/`) are replaced with `log.info(...)` / `log.error(...)` etc. Short-lived CLI output (printing `--version`, `--help`, the symptom/cause/fix block, the doctor table) stays on stdout/stderr — logs are the persistent record, not the human-facing surface.

`slashcash logs` is the user-facing reader. Flags:

- `--tail <n>` (default 50) — print the last n lines of today's file plus prior days as needed.
- `--follow` / `-f` — tail and follow new lines as they're written; SIGINT exits cleanly.
- `--filter <area>` — comma-separated areas (e.g. `--filter cron,ingest`); empty means everything.
- `--since <duration>` — `5m`, `1h`, `2d`; bounded by retention.
- `--json` — emit raw `LogEvent` JSON instead of human format.
- `--level <min>` — minimum level (default `info`).

Acceptance: a 24-hour soak (run via the nightly job on a developer box, not CI) produces a rotated log directory with the expected files; `slashcash logs --follow --filter cron` shows live cron events; a corrupted log line is skipped and reported, not crashed.

## W5 — Performance budgets and probes

Four budgets are recorded in `reference/decisions.md` as **ADR-020 — Performance budgets** and asserted in CI on the macOS runner:

- Cold CLI: `slashcash --version` end-to-end under 100ms p95.
- Doctor: `slashcash doctor --quick` under 200ms p95 on a healthy machine.
- Dashboard SSR: `/dashboard` first byte under 500ms p95 against the seed DB.
- Assistant first token: `POST /api/assistant` first stream byte under 1500ms p95 against a stub Ollama (real Ollama timing is volatile and is measured but not budget-asserted).

A small benchmark harness at `packages/e2e-tests/bench/` runs each budget five times, drops the slowest, and asserts p95. CI runs it on the nightly tier; regressions post a PR comment with the delta and the previous green commit. The benchmark itself is a guardrail, not a performance-tuning tool.

In-process timing probes emit `LogEvent` rows with `durationMs` set on hot paths: every CLI command's total duration, every doctor check, every cron tick, every assistant route call, every `gws` shell-out, every analytics procedure. Logs are the source of truth; a future menu-bar UI can read them.

Acceptance: the bench job is green on the current main commit; a deliberate slowdown in `slashcash --version` (added then removed in a probe PR) flips the budget and posts a comment; the cron path emits one probe per tick with the duration field set.

## W6 — Docs polish, drift gate, version-check ergonomics

Every reference doc is reread top to bottom against the shipped state. Anything that drifted gets fixed.

- `reference/cli.md` — every command's flags match `--help` exactly. The Phase 4 W2 `--help` parity test is now a hard gate.
- `reference/config.md` — every config key listed exists in the schema; every schema key is documented; defaults and validation rules match.
- `reference/skills.md` — manifest schema matches the JSON schema in code; the bundled-skill example is regenerated from the actual `gmail-swiggy` manifest.
- `reference/env-vars.md` — every env var the code reads is listed, with default and effect; no listed var is unread.
- `reference/decisions.md` — ADR-018 (single onboarding question), ADR-019 (CLI error block format), ADR-020 (performance budgets), ADR-021 (release pipeline shape) are written.
- `architecture.md` — the "Failure modes" matrix is regenerated from the doctor check registry.
- `current-state.md` — a "Phase 1–5 retrospective" section replaces the original "what exists today" framing; the cloud-coupling lists are kept for historical context but marked as historical.
- `README.md` (top-level) — reflects the local-first product; install instruction is `npm i -g slashcash`.

A version-check probe: when `slashcash --version` runs, it reads `~/.slashcash/cache/last-update-check.json` (default: never check). If the user opted into `updates.checkOnVersion true`, it makes a single `https://registry.npmjs.org/slashcash` registry metadata request once a day, caches the latest dist-tag, and prints "newer version available: X.Y.Z" if the latest dist-tag differs from the local version. Default behaviour: silent. This is the *only* outbound call the CLI ever makes outside the user's explicit ingest path, and only when the user opts in.

Acceptance: the doc-drift test passes; a PR that adds a new config key without documenting it fails the test; the version-check probe is silent by default and behaves correctly when the cache is empty, stale, or fresh.

## W7 — Decommission the hosted surface

A short workstream that finishes ADR-013. Concrete steps:

- Delete `render.yaml` (or anything else still pointing at the hosted app's deploy config) — the file is in the repo but unused.
- Confirm no GitHub workflow still talks to the hosted environment; remove any leftover deploy job stubs.
- Confirm the `apps/website` deployment now points the install-CTA at `npm i -g slashcash` instead of "sign up".
- Track DNS cutover and S3 cleanup in a separate runbook outside this repo (this repo doesn't own that infra); add a checklist link to `current-state.md`.
- Add a final entry to `current-state.md` recording the date the hosted dashboard was turned off.

Acceptance: a grep for "render.yaml", "app.slash.cash" and "supabase" in the repo returns zero hits in shipping code or workflows; `current-state.md` records the decommission date.

## Sequencing and rough schedule

W1 + W2 are the heaviest and run together since they share the bundle pipeline. W3, W4, W5, W6 are all S/M and can interleave. W7 is the last item and depends on W1 + W6 being shipped (so the npm install is the recommended path before we point the marketing site at it).

A reasonable single-engineer schedule is two weeks: W1 + W2 in week 1 (the release pipeline plus bundle hardening); W3 + W4 in week 2 days 1–3; W5 day 4; W6 day 5; W7 closes the phase on day 6.

## End-to-end verification

Add a Phase 5 scenario at `packages/e2e-tests/scenarios/phase-5.ts` with three flows. Note that this scenario runs against the *published tarball*, not the workspace dev binary.

1. **Published-install flow.** On a fresh macOS runner, `npm i -g slashcash@<latest>`, then `slashcash onboard --yes` against a stub Ollama and a fixture-fed `gws`. Assert healthz answers, the dashboard renders, the bundled skill is enabled, the assistant streams.
2. **Logs + probes flow.** Start a fresh install, run `slashcash sync --full` against the fixture, then `slashcash logs --since 5m --filter ingest --json` and assert the expected `LogEvent` shapes (one `area:"ingest"` event with `durationMs > 0`, one `area:"cron"` event for the tick, one `area:"db"` event for the migration check).
3. **Eval gate flow.** A small synthetic regression in the assistant prompt is applied in a branch; the eval CI job catches it and the PR is blocked. The flow is run as part of the Phase 5 release-gate dry-run, not on every PR (it's expensive).

Plus the Phase 1–4 gates re-run on every push.

## Exit gate

Phase 5 is done when: every success criterion above is met; a published `slashcash@1.0.0` (or whatever first stable version we choose) is on npm with provenance and a SBOM; a clean macOS install of the published tarball completes the Phase 3 onboard within budget; the eval CI job is required and green; `slashcash logs` is the documented way to see what the system did; the version-check probe is silent by default and works when opted in; every reference doc matches the shipped state; the hosted dashboard at `app.slash.cash` is off.

## Pending — hand to next agent

What shipped under Phase 5 so far: `.github/workflows/release.yml` (tag-triggered publish with provenance + SBOM + checksum + published-version smoke), `packages/cli/scripts/bundle-app.mjs`, `bundle:check`, `pnpm pack:local`, the `slashcash logs` reader, rotation-aware `LogEvent` writer under `packages/cli/src/runtime/log.ts`, `packages/e2e-tests/bench/perf-budget.ts`, `eval:gate` wiring, `phase-5.ts` scenario (fixture mode).

What the phase doc promises that is **not yet real in the repo**:

- [ ] Push a real `vX.Y.Z` tag and run the `release.yml` workflow end-to-end with a live `NPM_TOKEN`. Today the workflow is wired but has never been exercised on a real release.
- [ ] Confirm on GitHub that the run produces an npm provenance attestation, an uploaded `slashcash-sbom.json`, an uploaded `slashcash.sha256`, and that the `npx -y slashcash@<version> --version` smoke step passes on the published package.
- [ ] Run `npm i -g slashcash@<version>` on a **clean** macOS machine (no workspace checkout) and complete `slashcash onboard` from the published tarball. This is the only way to exercise the dual-mode `start` detection path against real installed layout.
- [ ] Replace the placeholder eval threshold in ADR-012 with a real baseline derived from model runs on approved data. Today the gate passes because `SLASHCASH_EVAL_SKIP_MODEL=1` short-circuits model calls in CI.
- [ ] Add hard perf gates for **dashboard SSR first byte** and **assistant first-token** to the bench harness. Today `packages/e2e-tests/bench/perf-budget.ts` only covers CLI / doctor / dev-mode paths; the two server-side budgets from ADR-020 are not asserted.
- [ ] Document the package-verification story for end users (how to check the provenance attestation, how to verify the checksum and SBOM) in `README.md` or a new `reference/release.md`.
- [ ] DNS / hosted-surface decommission outside the repo: point `slash.cash` at the CLI landing story, shut down or redirect `app.slash.cash`, and clean up Supabase / Vercel / Trigger / Render infra. Record the cutover date in `current-state.md` per W7.

Cross-cutting handoff the next agent should not forget:

- [ ] Stage and commit the current implementation before starting the next phase-fix pass, so CI runs against a clean baseline.
- [ ] Decide whether to clean the Next.js lint warnings. They do not fail `pnpm lint` today but they add noise for anyone reading logs.
- [ ] Run one final real-world dogfood pass (the screencast scenario in the doc intro) before calling v1 done.

Verification commands the next agent should rerun (fixture / local mode — the real-release variants are listed above):

```bash
pnpm architecture-smells
pnpm typecheck
pnpm lint
pnpm pack:local
pnpm bundle:check
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm eval:gate
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm e2e:phase-5
pnpm bench
```

Some of those commands need fixture or skip environment variables on machines without Ollama or a real `gws` account; see `reference/env-vars.md` and `reference/testing.md`.

## What's not in v1 even after Phase 5

No auto-updater. No menu-bar UI. No Raycast extension. No multi-user, sync or team features. No Windows or Linux as supported targets (Linux smell-tests still run; full support is a v2 conversation). No telemetry of any kind beyond the opt-in version check. No remote model fallback. No third-party-installable skill packages — skills v2 is a v2 roadmap topic. The product after Phase 5 is the v1 product; subsequent phases (Phase 6+) are the v2 roadmap and will be planned separately when v1 is shipping cleanly to real users.
