# Reference — Decisions (ADRs)

Short architectural decision records. Each entry captures a choice that shapes the plan, why we made it, what we rejected, and the revisit trigger. Updates to an ADR are done in-place with a date-stamped note; superseded ADRs are never deleted.

## ADR-001 — Reuse the existing Next.js dashboard

**Decision.** We wrap the existing `apps/main` with a CLI rather than extracting a new app or rewriting. Supabase, Trigger and the remote AI providers are removed from the existing code; the dashboard, tRPC routers, Drizzle schema and the Swiggy analytics structure are kept.

**Why.** The dashboard and query surface are the biggest assets in the codebase. Rewriting them adds months and risks regression on a working UI. The cloud edges are well-scoped and cleanly removable.

**Rejected.** Extracting a new `apps/desktop` — needless duplication. A ground-up rewrite — too much work for no product gain.

**Revisit if.** The cost of keeping the existing dashboard compatible with a local-first world ever exceeds the cost of a small, purpose-built dashboard. No signs of that yet.

## ADR-002 — SQLite via `better-sqlite3` as the only database

**Decision.** The app runs against a single SQLite file at `~/.slashcash/db.sqlite`. Drizzle is retained; the dialect changes from `pg-core` to `sqlite-core`. The driver is `better-sqlite3`.

**Why.** One person's inbox is tiny. SQLite has no install cost, no daemon, no network boundary. `better-sqlite3` ships prebuilt binaries for Node 20+, so the install story stays clean. Drizzle's `sqlite-core` is a first-class dialect.

**Rejected.** PGlite (embedded Postgres) — additional install surface and an interesting but less-proven story. A Docker'd Postgres — adds Docker as a prerequisite, against the one-command-install principle. Cloud Postgres — defeats the whole pivot.

**Revisit if.** We ever ship multi-device sync (then SQLite plus a sync layer, or a different store entirely, becomes worth discussing).

## ADR-003 — No authentication; bind to `127.0.0.1`

**Decision.** The Next.js server binds to `127.0.0.1` (explicitly, not `localhost`). The tRPC context returns a static local user id. Supabase Auth and all UI around it are removed.

**Why.** Single-user local apps get auth for free from the operating system: if you're on the machine, you're the user. Loopback bind is the boundary. Removing auth removes a huge amount of code, UI, server state and failure modes.

**Rejected.** A local-only PIN — doesn't defend against anything meaningful on a single-user machine. Keeping Supabase in "local dev" mode — pointless complexity.

**Revisit if.** We ever share a machine or run on a multi-user workstation intentionally.

## ADR-004 — Google auth is owned by `gws`

**Decision.** We never ship a Google OAuth client id, never handle Google tokens, and never store refresh tokens. During `slashcash onboard` the user provisions their own per-machine OAuth client through `gws auth setup` (see ADR-022 for the full gcloud-backed flow) and then runs `gws auth login --services gmail --readonly` to consent to Gmail read-only access. `gws` owns everything about Google authentication and API access from that point onward.

**Why.** This is the single biggest trust improvement over the hosted SaaS. The user's Google credentials never touch our code, and the OAuth client is scoped to their own Google Cloud project rather than a shared one we'd have to get verified. `gws` is maintained by Google Workspace's team and keeps current with API changes.

**Rejected.** An installed-app OAuth flow using our own shared client id — would require Google OAuth app verification (including an annual CASA security assessment for the restricted Gmail scope), commit us to a verified-app support surface, and cap us at 100 test users until that verification lands. IMAP with an app password — weaker auth, no attachment API, deprecated direction.

**Revisit if.** `gws` ever becomes unmaintained, or we decide to absorb the OAuth verification work to shave the two browser consents out of onboarding — at which point ADR-022 flips too.

## ADR-005 — Ollama with `gemma3n:e4b` as the default model

**Decision.** The CLI pulls and targets `gemma3n:e4b` during `onboard`. The AI SDK's OpenAI-compatible adapter is pointed at Ollama's local endpoint.

**Why.** `gemma3n:e4b` is a multimodal Gemma 3n variant tuned for efficiency and reasonable accuracy at about 3 GB on disk, which fits the ten-minute-onboard budget. Ollama is the de-facto standard for running local models on macOS and integrates cleanly with the AI SDK via OpenAI compatibility.

**Rejected.** Hard-coding a larger model (quality gain not worth the download time). A multi-provider abstraction (premature; one model is plenty for v1).

**Revisit if.** Eval quality is short of the bar agreed in ADR-012 on a meaningful subset of users' data.

## ADR-006 — `node-cron` in-process, single-flight mutex

**Decision.** Background work is a `node-cron` schedule in the same Node process that runs the Next.js server. A module-level mutex guarantees the Gmail ingest never runs concurrently with itself.

**Why.** One process is simpler to install, monitor, start and stop. At one user's data volume, there is no reason to split the worker out. A single mutex is enough to prevent the only concurrency hazard we care about.

**Rejected.** A separate worker process with IPC — more moving parts. A local queue (BullMQ, Redis) — needs Redis, which needs Docker, which violates the install budget.

**Revisit if.** The worker ever blocks the HTTP server long enough to be user-visible. Promotion to a child process with IPC is the next step.

## ADR-007 — macOS only in v1

**Decision.** v1 supports macOS only. Windows and Linux are explicitly out of scope.

**Why.** The `onboard` flow leans on Homebrew and macOS conventions. Supporting another platform means another package manager, another service manager, another set of codepath, and more importantly another set of install-time failures to test. We ship macOS cleanly before we add breadth.

**Revisit if.** The product finds traction and users ask for other platforms. Linux is the natural next target (Homebrew on Linux, or plain tarballs).

## ADR-008 — In-process Next.js + worker; promote later if needed

**Decision.** Phase 2 ships a single Node process hosting Next.js and the cron worker. No IPC, no child process split.

**Why.** Same reasoning as ADR-006. We avoid the overhead until we feel it.

**Revisit if.** A single long-running parse ever starves the HTTP server.

## ADR-009 — Ship a prebuilt Next.js standalone inside the npm package

**Decision.** The CLI's release workflow builds `apps/main` with Next's standalone output and bundles the result inside the published `slashcash` tarball. `slashcash start` detects whether it's running from an installed tarball or from this monorepo and spawns the right server.

**Why.** Running `next build` at install time is slow and fragile (image optimisation, sharp, node-gyp). Shipping a prebuilt tree makes `npm i -g slashcash` reliable and keeps the install fast. Native deps (`better-sqlite3`) ship prebuilds separately.

**Rejected.** `postinstall` build — slow and error-prone. A plain Electron wrapper — overkill.

**Revisit if.** Next.js standalone output ever stops fitting this shape.

## ADR-010 — Represent money as `real` in SQLite (provisional)

**Decision.** Monetary amounts are stored as SQLite `real` in the new schema. This is marked provisional because there is a legitimate case for high-precision `text` columns to avoid floating-point drift.

**Why.** At transaction granularity and typical rupee values, double-precision floats preserve exact values for the amounts we encounter. Queries are simpler. The trade-off is that high-precision accounting work (sums of hundreds of thousands of rows) would eventually accrue noticeable error.

**Rejected for now.** `text` with a decimal library in app code — correct but adds cognitive load everywhere and breaks direct SQL aggregation in the analytics rewrite.

**Revisit if.** Eval or user reports ever show aggregation drift.

## ADR-011 — `gws` and `gcloud` install method

**Decision.** `gws` is installed through Homebrew using the `googleworkspace-cli` formula documented in the upstream `gws` README. `gcloud` is installed through the Homebrew cask `google-cloud-sdk`. Both install sources are referenced from single constants (`GWS_BREW_FORMULA`, `GCLOUD_BREW_CASK`) in `packages/cli/src/onboard/run.ts` so any change is one file plus this ADR.

**Why.** `gws` distribution is evolving (the older `googleworkspace/tap/gws` tap is being replaced by the direct `googleworkspace-cli` formula). `gcloud` is now a hard prerequisite for onboarding because `gws auth setup` drives the Google Cloud project / OAuth client provisioning through it (see ADR-022). Keeping both install sources in one place keeps the swap cheap.

**Revisit on every Phase 2 W1 or Phase 3 W1 touch.** If the upstream distribution for either tool moves, update this ADR and the two constants in the same PR as the `auth-invalid-client.fix` / `gcloud-missing.fix` diagnostic strings.

## ADR-012 — Local vs cloud eval delta threshold (provisional)

**Decision.** Phase 2 W10 sets a hard threshold — recorded here once decided — for local eval accuracy versus the historical cloud baseline on both the extraction set and the assistant Q&A set. CI fails merges below the threshold. The initial placeholder is "ninety percent of baseline"; the real number is confirmed after a prototype pass on real data.

**Why.** Without a number, "good enough" drifts.

**Revisit if.** Any of the underlying models, prompts or eval sets changes meaningfully.

## ADR-013 — No dual-run; fully local

**Decision.** There is no cloud mode, no mode switch, no dual build. The hosted app at `app.slash.cash` is being retired as part of this pivot; the marketing site at `slash.cash` is updated at the end of Phase 2 to point at the CLI. The codebase is single-track.

**Why.** Dual-run adds a second build target, a second test matrix, a second mental model for every contributor, and a set of gating annotations that we would have to maintain for the lifetime of the project. None of that pays for itself once the local product is the recommended path. A clean deletion is cheaper than a gate.

**Rejected.** Keeping both hosted and local alive through a `SLASHCASH_MODE` flag — higher ongoing cost, no product benefit.

**Revisit if.** We ever decide to re-launch a hosted version. At that point we build a new hosted app deliberately, not by re-enabling flags in the local codebase.

## ADR-014 — Plain markdown `packages/docs`

**Decision.** The plan and reference docs live in `packages/docs/` as plain markdown files, with no build step, no site generator and no JSON config.

**Why.** The audience is the execution chat and a very small human team. A static site is more effort than it is worth; markdown renders in every editor and on GitHub. We can add Mintlify or Nextra later if external users need polished docs.

**Revisit if.** External users ever consume these docs directly.

## ADR-015 — CLI framework

**Decision.** Commander.js for argument parsing, with a lazy-loaded command catalog inspired by openclaw's bootstrap pattern.

**Why.** Commander is battle-tested and has a light footprint. Lazy loading keeps cold CLI fast. The openclaw pattern is proven at the kind of scale we plan to grow into.

**Rejected.** Clipanion or oclif — more structure than we need for a small CLI. A bespoke argv parser — wasted effort.

**Revisit if.** Command count exceeds what Commander tolerates cleanly (dozens).

## ADR-016 — Continuously learn from `../openclaw`

**Decision.** The sibling repo at `../openclaw` is the primary reference for CLI, onboarding, doctor, state-directory, skills-folder and release patterns. Every workstream begins by reading the openclaw counterpart before writing ours. We adopt the **patterns** — shapes of modules, sequencing of checks, data layouts on disk, coding conventions — and we do not copy code. This is a standing rule for the life of the project, not a one-time exercise.

**Why.** Openclaw has already absorbed the cost of discovering what works for a local CLI that bootstraps a sizable environment, runs a long-lived process on loopback, self-diagnoses, and ships as an npm package. Re-deriving those patterns from scratch would be wasteful, slower, and more error-prone. Lifting them is cheap and well-understood.

**Rejected.** A one-time "initial port" and then ignore openclaw — predictable drift. Hard-wiring openclaw as a dependency — different product surface, different release cadence; shared code would create coupling we don't want.

**Revisit if.** Openclaw changes direction in a way that no longer matches local-first product CLIs, or we find we're copying code rather than patterns. If that ever happens, it is a signal to abstract shared pieces into a small shared package rather than keeping duplicated lifts.

## ADR-017 — Every phase ends with an automated end-to-end verification

**Decision.** No phase is declared done until the phase's end-to-end scenario in [`testing.md`](./testing.md) passes on a clean machine. The scenario uses the real CLI, real SQLite, real Ollama, and — for Phase 2 — real `gws` against a real test Google account. It runs in CI on every phase-complete PR and is also run manually by the maintainer as a final dogfood.

**Why.** A local-first product lives or dies on install-flow reliability and end-to-end integration between three or four independent subsystems (Next.js, SQLite, Ollama, `gws`, skills). Unit tests can't find the class of bugs that hides in the seams between those systems. An explicit E2E gate per phase makes the right thing cheap to prove and the wrong thing hard to ignore.

**Rejected.** Unit tests only — misses integration failures. Manual QA only — not reproducible, drifts, doesn't block merges. A continuous long-running E2E — unnecessary overhead for phase-paced delivery.

**Revisit if.** The E2E suite grows so expensive in CI minutes that it meaningfully slows phase cadence. At that point we subset the suite between phases and restore the full run at the gate.

## ADR-018 — Single onboarding question

**Decision.** `slashcash onboard` asks exactly one user-facing question: which chat model to pull and use. The default is `gemma3n:e4b`, with `gemma3:4b` and `qwen2.5:7b` offered as alternatives. `--yes` accepts the default and `--non-interactive` fails if a prompt would be needed.

**Why.** Every additional prompt adds friction. The model choice is the only current setup question with a real user trade-off: download size, speed and answer quality.

**Rejected.** Asking for port, sync schedule or initial skill selection. The defaults work for most users, and every value remains editable through `config.json` or `slashcash config set`.

**Revisit if.** We add a second bundled skill or a model requirement whose download size is meaningfully larger than the default.

## ADR-019 — CLI error block format

**Decision.** CLI-facing failures use the same block everywhere: `error[area]: symptom`, then `cause`, then `fix`, plus optional `docs`. The implementation lives in `packages/cli/src/errors/format.ts`.

**Why.** Users should never have to read raw JSON or a stack trace to understand the next step. The format is also easy for tests and future UI surfaces to parse.

**Rejected.** Free-form `throw new Error(...)` text at command boundaries.

**Revisit if.** A future UI needs structured error transport over something other than stdout/stderr.

## ADR-020 — Performance budgets

**Decision.** Phase 5 records two layers of budgets. The published-binary targets are cold `slashcash --version` under 100 ms p95, `slashcash doctor --quick` under 200 ms p95, dashboard first byte under 500 ms p95 against seed data, and assistant first token under 1500 ms p95 against stub Ollama. The current development harness runs through `pnpm` and asserts looser guardrails: `slashcash --version` under 1000 ms and `slashcash doctor --quick` under 3000 ms. Tight published-install budgets are enforced once the tarball smoke path is running against the installed package.

**Why.** Local-first software feels broken when startup or first response time regresses silently. Budgets make performance a release concern rather than folklore.

**Rejected.** Real-Ollama first-token as a hard CI budget; local model timing is too hardware-dependent.

**Revisit if.** CI hardware changes or published-install dogfood shows the budgets are unrealistic.

## ADR-021 — Release pipeline shape

**Decision.** Releases publish from `vX.Y.Z` tags. The workflow validates the tag against `packages/cli/package.json`, runs the source gates, builds the standalone app, packs the CLI, publishes to npm with provenance, smoke-tests the published bin, and attaches a checksum plus SBOM to the GitHub release.

**Why.** Tag-based release is auditable and matches npm provenance expectations. The published package is the artifact users install, so the release workflow must exercise the bundled-app path.

**Rejected.** Publishing directly from every push to `main`.

**Revisit if.** Changesets or npm provenance requirements change enough that this flow becomes brittle.

## ADR-022 — BYO-GCP Google onboarding via `gcloud` + `gws auth setup`

**Decision.** `slashcash onboard` provisions Google access for each user through their own Google Cloud project. The sequence is:

1. Install the `gcloud` CLI (Homebrew cask from ADR-011).
2. Run `gcloud auth login` interactively so gcloud has active user credentials.
3. Install the `gws` CLI (Homebrew formula from ADR-011).
4. Run `gws auth setup`, which (per the upstream `gws` README) uses gcloud to create or select a Google Cloud project, enable the Gmail API, create a Desktop-type OAuth client, add the signed-in account as a test user, and write `~/.config/gws/client_secret.json`.
5. Run `gws auth login --services gmail --readonly` so the user consents to Gmail read-only access for Swiggy ingest.

This is the path the `gws` authors recommend when `gcloud` is available; it is the cheapest way to bootstrap a working OAuth client without us owning one.

**Verified probe on 2026-04-17.** The installed upstream binary was `gws 0.22.5` from `@googleworkspace/cli`, reached at `/Users/ravikumarr/.nvm/versions/node/v22.12.0/bin/gws`. `gws auth setup --help` exposes only these setup-specific flags: `--project <id>`, `--login`, and `--dry-run`. It does not expose setup-time flags for a scope list, service/API list, readonly mode, or test-user email. The guessed setup flags `--services gmail`, `--scopes gmail.readonly`, `--readonly`, and `--test-user nobody@example.com` all fail validation with exit code 3. `gws auth login --help` does expose `--scopes <scopes>`, `--readonly`, `--full`, and `--services <services>`, so slashcash keeps scope narrowing on the login step.

**Live correction on 2026-04-17.** Passing `--scopes gmail.readonly` to `gws auth login` reached Google as the raw invalid OAuth scope `gmail.readonly` and produced `Error 400: invalid_scope`. The login step now uses the upstream service filter instead: `gws auth login --services gmail --readonly`. This lets `gws` resolve the valid Gmail read-only OAuth scope instead of slashcash spelling one manually.

`gws auth setup --project slashcash-probe --dry-run` was also verified. It made no changes, accepted the project id, found the active gcloud account, and reported that setup would enable 22 Workspace-related APIs including `gmail.googleapis.com`, then configure OAuth credentials at `~/.config/gws/client_secret.json`. Because setup does not expose a non-interactive API-list or test-user flag, slashcash does not pass partial hidden setup flags from `config.json`; `gws-setup` inherits the user's TTY and lets upstream handle any project/API/OAuth prompts. There is intentionally no `google.projectId` config key in v1.

**Scripted-gcloud fallback status on 2026-04-17.** The safe help probes verified the syntax for `gcloud projects create [PROJECT_ID]`, `gcloud config set project PROJECT_ID`, and `gcloud services enable gmail.googleapis.com`. No live project was created and no service was enabled from this development machine. The proposed `gcloud alpha iap oauth-brands` / `oauth-clients` family could not be verified without installing the `alpha` component; help attempted to install that component and exited because the session was non-interactive. More importantly, no verified `gcloud` command path has been proven to create a Desktop OAuth client, add a test user, and write a `gws`-compatible `client_secret.json`. Do not implement the scripted fallback until it has been exercised against a disposable Google account/project, or until upstream documents a supported non-interactive Desktop OAuth client path. For now, `gws auth setup` remains the only verified writer of the OAuth client file.

**Why.** The alternative is shipping our own verified OAuth client, which for the restricted Gmail scope would require a public privacy policy, verified homepage, domain verification, and an annual CASA security assessment. For a local-first v1 that runs on a few hundred users' own machines, BYO-GCP is materially cheaper for us and keeps the user's Gmail token fully inside their own Cloud project. It is heavier for the user (two browser consents instead of one, plus a ~400 MB `google-cloud-sdk` download), but eliminates the current `invalid_client` / `redirect_uri_mismatch` failure modes because every user now has a properly provisioned client.

**Scope policy.** We ask for Gmail read-only access only. Wider Gmail scopes (full Gmail scope, send, modify) are explicitly out of v1. Enlarging the scope set later is an ADR edit plus a wizard change.

**Rejected.**

- Shared verified OAuth client owned by us. Higher commitment, adds a support surface we do not want to run for a local-first CLI, blocked on CASA assessment for a restricted scope.
- Reusing gcloud Application Default Credentials (`gcloud auth application-default login` + `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE`). Tempting because it collapses the two consents into one, but ADC is not the intended carrier for user-owned Google Workspace API access and Google has been tightening that path. Not policy-safe to recommend.
- Manual Cloud Console click-through (per the `gws` README's "Manual OAuth setup" path). Works, but is an entire multi-step UI walk through Cloud Console and is the opposite of "easy for customers."
- A hand-rolled `gcloud` OAuth-client fallback in Phase 3. Project creation and Gmail API enablement are straightforward, but the Desktop OAuth client plus test-user path is not verified through `gcloud` and would be worse than delegating to upstream `gws auth setup`.

**Revisit if.**

- We decide to absorb Google's OAuth app verification cost (privacy policy, domain verification, annual CASA assessment) and ship a verified shared client. At that point ADR-004 and this ADR both change in the same PR.
- `gws` gains a first-class path that provisions a client without `gcloud` (e.g. a Google-hosted setup endpoint). We would drop the `gcloud` prerequisite from onboard.
- A verified shared client would also change the pre-`gws auth login` privacy line, because the consent screen would no longer describe an app created inside the user's own Cloud project.

## ADR-023 — Privacy disclosures surface at onboarding

**Decision.** The privacy claims that make this product worth installing (local-only data, BYO Google Cloud project, no telemetry, loopback-only dashboard) are printed by the wizard at four moments: top-of-onboard banner, pre-`gcloud auth login` line, pre-`gws auth login` line, and final summary. They are reachable forever through `slashcash privacy`. The wizard also prints one operational safety note before `gws auth setup`: upstream `gws` may ask whether to run `gws auth login` immediately, and slashcash tells the user to answer `n` so the next step can request Gmail read-only access with `gws auth login --services gmail --readonly`. The wizard does not gate on acknowledgement; trust is built by showing the facts at the moments the user is deciding whether to click Allow. Copy and setup guidance live in one file, `packages/cli/src/privacy/copy.ts`, so the wizard and the standing command never drift.

**Why.** The developer audience (see `vision.md` "Target audience for v1") evaluates trust at the consent screen, not on a landing page. The product principle is "trust is surfaced, not buried", so onboarding itself has to say where data, tokens, PDFs, model calls and telemetry do or do not go.

**Rejected.** A single upfront dump (users skim it). Legal "I accept" checkboxes (wrong product). Printing only via a separate command (missed by the users who most need it).

**Revisit if.** ADR-022 changes to a verified shared Google client, if the hosted surface returns, or if any telemetry/version-check default changes. Any of those would require changing the copy and its snapshots in the same PR.
