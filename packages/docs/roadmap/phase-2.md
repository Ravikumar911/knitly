# Phase 2 — Local-first feature parity

> *Goal: a user on a clean macOS box runs `npm i -g slashcash`, then `slashcash onboard`, then `slashcash start`, and ends up with the full Swiggy analytics and chat assistant experience, powered by their own Gmail and their own machine — with no outbound traffic outside their laptop after `onboard` finishes. This is where the pivot becomes a product.*

Phase 2 assumes every Phase 1 exit-gate item is green. It does not revisit them.

**Standing conventions for this phase.** Keep pulling patterns from `../openclaw`. The pieces most directly informed by openclaw here are the `onboard` wizard shape (idempotent, cancel-safe, doctor-resumable), the doctor check/repair registry, the skill folder format, subprocess wrappers with closed error unions (for `gws` and `ollama`), the release pipeline, and the provenance attestation on npm publish. Study those areas in openclaw before implementing; adapt the pattern to our product surface rather than copying code. As in Phase 1, the phase isn't done until the Phase 2 end-to-end scenario in [`../reference/testing.md`](../reference/testing.md) passes from a clean macOS machine; see "End-to-end verification" below.

## Success criteria

1. A clean macOS machine goes from `npm i -g slashcash` to a populated dashboard in under about ten minutes wall time, including the model download, on a typical broadband connection.
2. After `onboard`, the dashboard shows real Swiggy transactions extracted from the user's own Gmail. No seed data.
3. The chat assistant, powered by local `gemma3n:e4b`, answers the Swiggy evaluation set at a quality level agreed against the existing `packages/evals` baseline (the delta is recorded in ADR-012 in `reference/decisions.md`).
4. `slashcash doctor` is green on a clean install, and `slashcash doctor --fix` recovers from every documented failure mode.
5. Every analytics procedure returns correct results from SQLite, not seed fixtures.
6. The PDF viewer works against the local attachments directory.
7. The skill registry supports listing, enabling and disabling skills. The bundled `gmail-swiggy` skill is installed and enabled by `onboard`; disabling it stops Gmail ingest.
8. `slashcash` is published on npm as a public package and installs cleanly on a fresh macOS machine with Node 20 or later.

## Workstreams overview

Sizing is S, M or L as in Phase 1.

1. **W1 — `slashcash onboard` interactive wizard (M).** Take a new user from `npm i -g slashcash` to a ready-to-run state: detect or install Homebrew, install Ollama, pull `gemma3n:e4b`, install `gws`, run `gws auth login`, create `~/.slashcash/`, migrate the DB, and enable the bundled skill.
2. **W2 — `gws` Gmail ingest (M).** Replace the Gmail REST / Google OAuth path with a `gws` subprocess wrapper. Delete the Trigger-era Gmail and Google-auth modules. Make the existing `emails.*` tRPC procedures drive the new in-process ingest.
3. **W3 — Local cron and single-flight worker (S).** Register the Gmail ingest job with the `node-cron` schedule from Phase 1 W7. Guard it with a module-level mutex so cron ticks and `slashcash sync` can't overlap.
4. **W4 — PDF attachment storage (S).** Land attachments under `~/.slashcash/attachments/`. Add an attachment-serving route in Next.js. Point the PDF viewer at it. Enforce strict path-traversal checks at the serving route.
5. **W5 — Swiggy analytics rewrite on SQLite (L).** Replace the Postgres JSONB-heavy analytics module with a SQLite-compatible implementation that mixes JSON1 operators and app-side aggregation as appropriate. Remove the raw-SQL agent tools in favour of a fixed set of typed Drizzle-backed tools. Re-enable the real analytics procedures in `apps/main/trpc/routers/analytics.ts`.
6. **W6 — Ollama vision parsing (M).** Replace the old cloud OCR path with a local one. Start with `gemma3n:e4b` multimodal; if evals flag quality problems, switch to a dedicated local VLM pulled by `onboard`, and expose the model id as a config key.
7. **W7 — Skills system v1 (M).** Define the on-disk skill format, build the registry that discovers and validates skills at CLI start, ship the `skills list / enable / disable` subcommands, bundle the Gmail-Swiggy skill, and make `doctor` check the required binaries for each enabled skill.
8. **W8 — Packaging and distribution (M).** Teach the Next.js app to build in "standalone" mode, bundle that tree inside the published CLI package, wire a GitHub release workflow that builds and publishes `slashcash` to npm with a provenance attestation, and smoke-test the tarball on a clean macOS machine.
9. **W9 — Doctor expansion and error UX (S).** Implement every check and repair on the failure-mode matrix from `architecture.md`. Add `doctor --json` for machine-readable output and `doctor --quick` for a subset that skips network probes. Standardise CLI error messages around symptom, cause and the one command that fixes it.
10. **W10 — Evals as a quality gate (S).** Parametrise the eval harness on provider, add the assistant-Q&A set if it isn't already there, and run evals in CI against the local provider on every push with a hard threshold.

## W1 — Onboard

The wizard is idempotent and cancel-safe. Re-running it after success should be a fast no-op; cancelling mid-way should leave the machine in a recoverable state that `slashcash doctor --fix` can finish. No sudo; every installation is through Homebrew. If Homebrew itself is missing, the wizard prints the official install one-liner and waits for the user to run it rather than executing a remote shell script on their behalf.

Steps, in order. Check Homebrew and prompt for install if missing. Install Ollama through Homebrew if not present; start it as a brew service; wait for its API port to respond. Pull `gemma3n:e4b`, streaming the progress output as-is rather than hiding it behind a spinner. Install the `gcloud` CLI (via the Homebrew cask recorded in ADR-011) if it isn't already on `PATH`. If no gcloud account is active, run `gcloud auth login` interactively so gcloud inherits the terminal and the user completes consent in their own browser. Install `gws` through the Homebrew formula recorded in ADR-011 (referenced from a single constant in the code). Run `gws auth setup` interactively — per the `gws` README this is the command that uses the active gcloud credentials to create (or reuse) a Google Cloud project, enable the Gmail API, create a Desktop-type OAuth client, add the logged-in user as an OAuth test user, and drop the resulting `client_secret.json` under `~/.config/gws/`. Then run `gws auth login --services gmail --readonly` so the user consents to Gmail read-only access for Swiggy ingest. Create `~/.slashcash/` with correct permissions, write a default `config.json`, run SQLite migrations, copy the bundled `gmail-swiggy` skill into `~/.slashcash/skills/` and mark it enabled in config. Print a final message pointing at `slashcash start`.

The onboarding therefore requires **two browser consents** (one for gcloud, one for the per-user OAuth client), but **zero manual clicks in Cloud Console**: `gws auth setup` owns project creation, API enablement, OAuth client creation, and test-user provisioning. This is the trade-off captured in ADR-022 — we keep ADR-004 (no shared OAuth client) and accept the heavier flow instead of committing to Google's OAuth app verification track for v1.

Acceptance is the clean-machine flow in success criterion 1, plus a fast re-run of `onboard` that touches nothing.

## W2 — `gws` Gmail ingest

A thin wrapper module under `packages/tasks/src/utils/` isolates `gws` from the rest of the codebase. Callers list messages for a query and fetch messages by id in typed domain objects; the wrapper spawns `gws` with `--format json`, validates stdout against a schema, and maps known failure states to a closed error-code union (binary missing, not authenticated, rate-limited, unknown).

The existing `processEmails` pipeline is rewritten as a plain async function — the coordinator, the per-batch logic, and the dedupe step all become ordinary functions that iterate rather than relying on Trigger's `batch.triggerByTaskAndWait` and `wait.until` primitives. The existing RFC822 parsing and PDF attachment extraction continue to live in a small reusable module; only the source of the Gmail payload changes.

The old cloud integration goes away entirely: `packages/tasks/src/utils/gmailApi.ts`, `utils/googleAuth.ts`, `utils/supabase.ts`, and the `trigger.config.ts` are deleted. The `emails.initiateSync` and `emails.refresh` tRPC procedures stop calling Trigger and call the new in-process ingest through the mutex from W3. Progress flows through the existing `email_sync_status` table and the existing `emails.getSyncProgress` procedure; the UI contract doesn't change.

Acceptance is that after `gws auth login`, `slashcash sync --full` populates `parsed_emails` and `transactions_v2` from the user's real Gmail, and the dashboard reflects new rows within one cron tick after ingest.

## W3 — Cron and single-flight

A single module-level mutex wraps the Gmail ingest function. The `node-cron` tick tries to acquire it non-blocking; if the mutex is held, the tick logs and skips. The tRPC "sync now" procedure acquires the same mutex. Failures inside the job record to `email_sync_status.lastError` and log structurally; they don't crash the worker or the Next.js server. On SIGTERM or SIGINT the process finishes the current tick up to a short grace window before exiting.

The schedule string lives in `config.json` (default every fifteen minutes). The job registry is data-driven: skills declare the jobs they contribute, and the registry picks them up at start. The Gmail-Swiggy skill is the first and only contributor in Phase 2.

Acceptance is that invoking `slashcash sync` twice quickly produces one real run and one skipped one, and killing the process mid-run leaves no orphan `gws` children.

## W4 — Attachments

Attachments are written to `~/.slashcash/attachments/` by the ingest path, using the email id as the filename base. `parsed_emails.attachmentStoragePath` records the absolute path. A new Next.js route at `/api/attachments/<id>` looks up the row in SQLite, resolves the path, checks that the resolved path is inside the attachments root, and streams the file with the correct content-type. The PDF viewer component is updated to fetch from the new route. The old Supabase Storage helper and the signed-URL helper are deleted.

Acceptance is that clicking a transaction with a PDF shows the PDF end-to-end, and that a crafted request with a traversal-style id returns a 400.

## W5 — Swiggy analytics on SQLite

This is the biggest single piece of Phase 2 work. Each export of the analytics module gets reimplemented for SQLite. The general approach is to pick the simplest of two strategies per query: SQLite JSON1 operators where the query is a clean aggregation that benefits from running in the database, or plain SELECTs followed by app-side aggregation where the SQL would otherwise get hard to read. At the scale of one person's transaction history, app-side aggregation is usually fast enough and always clearer.

Snapshot testing against Phase 1's deterministic seed data is the correctness harness: every query's output is pinned to a fixture, the rewrite has to reproduce that fixture, and the fixtures become regression tests. Once every procedure passes, the tRPC gates in `analytics.*` that returned seed fixtures in Phase 1 are removed.

As part of this workstream, the raw-SQL agent tools at `apps/main/lib/ai/tools/generate-sql.ts` and `execute-sql.ts` are deleted. The assistant instead gets a fixed catalogue of typed tools — one per analytics procedure we want it to reach — each of which calls a Drizzle query. This removes an entire class of prompt-level portability problems and is safer besides.

Acceptance is real numbers in dashboard charts, no raw SQL reaching SQLite from the assistant's tool path, and a green run of the analytics snapshot tests.

## W6 — Vision parsing

A prototype pass feeds a small corpus of representative Swiggy PDFs through `gemma3n:e4b` (multimodal) and measures extraction accuracy against the existing baseline. If accuracy is acceptable, the existing OCR agent is ported to this one-model path. If accuracy is short, the wizard additionally pulls a dedicated vision-language model (one of the `qwen2.5vl` or `llava` families, pinned in ADR-012 of `reference/decisions.md`), the provider module exposes a separate vision model id, and the config schema gains a vision-model key. Doctor checks that the chosen vision model is pulled. PDF pages are rasterised to images at render time with a small library; the VLM receives images rather than raw PDF bytes.

Acceptance is that end-to-end extraction accuracy on the eval PDF set meets the agreed delta vs the historical Mistral baseline.

## W7 — Skills v1

A skill is a folder containing a `SKILL.md` with YAML frontmatter and a `manifest.json` that duplicates the machine-readable parts of the frontmatter for fast load. Manifests declare a version, a category, a list of binaries the skill needs on `PATH`, and the cron jobs the skill contributes. The registry discovers skills by enumerating `~/.slashcash/skills/*/manifest.json` at start, filters by the enabled flag in `config.json`, and registers each skill's jobs with the worker's job registry. The CLI exposes `skills list`, `skills enable <id>` and `skills disable <id>`. The `doctor` pipeline validates each enabled skill's required binaries.

The only bundled skill is `gmail-swiggy`, shipped inside the CLI package and copied to `~/.slashcash/skills/` by `onboard`. Users can edit its `SKILL.md` to change the Gmail query it uses. Adding a new folder under `~/.slashcash/skills/` with a valid manifest makes the skill visible in `skills list`.

There is no versioned plugin SDK, no sandboxing, and no npm-installable skill packages in v1. Those are v2+.

Acceptance is that `skills list` shows the bundled skill, disabling it stops Gmail ingest on the next cron tick, and dropping a manually-authored skill into the skills directory shows up in `list` without a CLI restart.

## W8 — Packaging and distribution

The Next.js app is configured to emit Next's "standalone" output. The release workflow builds the whole monorepo, copies the standalone tree (plus static assets and the `public/` folder) into a `dist/app/` directory inside `packages/cli`, pnpm-packages the CLI with the prebuilt app inside, and publishes it to npm. The CLI's `start` command detects whether it's running from an installed tarball (presence of the prebuilt app) or from the monorepo (dev mode), and spawns the right server accordingly. The native `better-sqlite3` install cost is handled by that package's own prebuilt binaries; pinning Node 20 or later makes this reliable.

The release workflow also publishes a provenance attestation and tags the release in git. After the first successful publish, the landing page at `slash.cash` is updated to point at the CLI; the hosted dashboard at `app.slash.cash` is turned off.

Acceptance is `npm i -g slashcash` on a clean macOS box, followed by a clean `onboard` and a populated dashboard, from a published version of the package.

## W9 — Doctor and error UX

Every failure mode enumerated in `architecture.md` becomes a check and, where possible, a repair. A machine-readable output mode supports future integrations (a menu-bar app, a Raycast extension, whatever comes later). A `--quick` flag runs only the local filesystem checks and skips network probes. Every error raised by the CLI follows one format: a one-line symptom, a one-line cause, and the one command the user should run to fix it.

## W10 — Evals as a quality gate

The eval harness in `packages/evals` runs against the local provider end-to-end. A hard threshold, recorded in ADR-012, gates merges: if local accuracy falls below the agreed fraction of the historical baseline on either the extraction eval set or the assistant Q&A set, CI fails. The threshold can be adjusted but only through the ADR.

## Sequencing and rough schedule

Onboard (W1) and `gws` ingest (W2) are the critical path: until they exist, the app can't reach end-to-end real data. The cron mutex (W3) and attachments (W4) are small and land alongside ingest. The analytics rewrite (W5) and the vision work (W6) are the two "big" pieces and are independent of each other, so one engineer can interleave them to let evals reference vision output. Skills (W7) sits on top of the ingest and cron work. Doctor expansion (W9) picks up as each workstream lands. Packaging (W8) is last. A reasonable rough schedule for one engineer is about four weeks: onboard and doctor foundation in week one, `gws` ingest and attachments in week two, analytics and vision in week three, skills, evals, packaging and release candidate in week four.

## End-to-end verification

Before declaring Phase 2 done, the Phase 2 scenario in [`../reference/testing.md`](../reference/testing.md) must pass on a clean macOS machine that has no Homebrew, no Ollama, no `gws`, no `~/.slashcash/` and no prior install of the CLI. At a high level the scenario is: `npm i -g slashcash`, `slashcash onboard` (with a test Google account), `slashcash start`, an automated check that dashboards show transactions extracted from that account's real Gmail, the assistant streams a meaningful answer from `gemma3n:e4b`, clicking a PDF in the UI serves it from the local attachments root, `slashcash skills list` shows the bundled skill enabled, disabling the skill stops further ingest on the next cron tick, and `slashcash stop` leaves no stray processes or orphaned `gws` children. Time-to-green on a typical broadband connection stays inside the budget in success criterion 1. The eval suite also runs as part of this gate and meets the thresholds in ADR-012. This whole flow is scripted and runs in CI against a dedicated test Google account; the mechanics live in `reference/testing.md`.

## Pending — hand to next agent

The fixture-backed Phase 2 gates are green (`pnpm e2e:phase-2`, `gws`-fixture ingest, local attachments route, skill toggle, analytics snapshots against seed). What the repo still has not verified against a real account:

- [ ] Install `gcloud` on a clean machine and run `gcloud auth login` as part of onboard (new step per ADR-022).
- [ ] Run real `gws auth setup` on top of the live gcloud session — confirm it creates the project, enables the Gmail API, creates the Desktop OAuth client, adds the account as a test user, and writes `~/.config/gws/client_secret.json`.
- [ ] Run real `gws auth login --services gmail --readonly` with a dedicated Google test account and confirm the consent screen lists only Gmail read-only access.
- [ ] Sync against a real deterministic Swiggy inbox, not `SLASHCASH_GWS_FIXTURE_DIR`.
- [ ] Run extraction without `SLASHCASH_SYNC_SKIP_AI=1`, using a real local Ollama model.
- [ ] Verify cron ticks ingest real mail over time (not only manual `slashcash sync --full`).
- [ ] Ask the assistant a real Swiggy analytics question after ingest and verify the numeric answer matches what the snapshot-backed analytics return.

Verification commands the next agent should rerun:

```bash
pnpm e2e:phase-2
pnpm --filter @workspace/tasks test
pnpm --filter @workspace/database test
pnpm architecture-smells
pnpm fixtures:check
```

## Exit gate

Phase 2 is done when the end-to-end scenario above passes from a clean state, every success criterion listed at the top of this document is satisfied, the landing page at `slash.cash` points at the CLI, the hosted dashboard is off, and the README and `packages/docs` reflect the shipped state.
