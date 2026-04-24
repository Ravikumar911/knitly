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

> **Superseded on 2026-04-22 by ADR-024.** Gmail access in v1 moves from `gws`-brokered OAuth to user-issued IMAP app passwords. The original decision and its trade-offs are preserved below per repo convention; do not implement against it. The IMAP pivot shipped as `roadmap/pivot-imap.md` (retired on 2026-04-23; see [`../current-state.md`](../current-state.md) § Retired phase docs and `git log -- packages/docs/roadmap/pivot-imap.md`).

**Decision.** We never ship a Google OAuth client id, never handle Google tokens, and never store refresh tokens. During `slashcash onboard` the user provisions their own per-machine OAuth client through `gws auth setup` (see ADR-022 for the full gcloud-backed flow) and then runs `gws auth login --services gmail --readonly` to consent to Gmail read-only access. `gws` owns everything about Google authentication and API access from that point onward.

**Why.** This is the single biggest trust improvement over the hosted SaaS. The user's Google credentials never touch our code, and the OAuth client is scoped to their own Google Cloud project rather than a shared one we'd have to get verified. `gws` is maintained by Google Workspace's team and keeps current with API changes.

**Rejected.** An installed-app OAuth flow using our own shared client id — would require Google OAuth app verification (including an annual CASA security assessment for the restricted Gmail scope), commit us to a verified-app support surface, and cap us at 100 test users until that verification lands. IMAP with an app password — weaker auth, no attachment API, deprecated direction.

**Revisit if.** `gws` ever becomes unmaintained, or we decide to absorb the OAuth verification work to shave the two browser consents out of onboarding — at which point ADR-022 flips too.

## ADR-005 — Ollama with `gemma3n:e4b` as the default model

> **Scope updated on 2026-04-23 by ADR-026.** Gemma remains the sole model for chat, for email-body extraction, and for the reconciliation pass that merges body + PDF candidates. Deterministic PDF extraction is no longer Gemma's job; it is delegated to Docling (see ADR-026). The rest of this ADR is unchanged.

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

> **Superseded on 2026-04-22 by ADR-024.** `gws` and `gcloud` are no longer installed by `slashcash onboard`; Gmail access now goes through IMAP + an app password. The `GWS_BREW_FORMULA` / `GCLOUD_BREW_CASK` constants were deleted during the retired pivot's B1 workstream (see [`../current-state.md`](../current-state.md) § Retired phase docs). The original decision is kept below for history.

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

> **Amended on 2026-04-22 by ADR-024.** The onboarding surface now has three user inputs instead of one: the chat-model `select`, the Gmail address `text`, and the app-password `password`. The justification below still stands for "don't ask for anything else" (port, schedule, skill choice, etc.); the Gmail pair is not a "question" in the ADR-018 sense but a credential input that has no defensible default. Do not add prompts beyond these three without a new ADR.

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

**Decision.** Releases publish from `vX.Y.Z` tags. The workflow validates the tag against `packages/cli/package.json`, runs the source gates, builds the standalone app, packs the CLI, validates npm metadata and package contents, publishes that exact tarball to npm with provenance, verifies a fresh npm install, and attaches a checksum plus SBOM to the GitHub release. A separate install-smoke workflow runs the packed-install path on PRs and pushes to `main`.

**Why.** Tag-based release is auditable and matches npm provenance expectations. The published package is the artifact users install, so the release workflow must exercise the bundled-app path before and after npm publish.

**Rejected.** Publishing directly from every push to `main`.

**Revisit if.** Changesets or npm provenance requirements change enough that this flow becomes brittle.

## ADR-022 — BYO-GCP Google onboarding via `gcloud` + `gws auth setup`

> **Superseded on 2026-04-22 by ADR-024.** BYO-GCP is replaced by IMAP + user-generated app password. The ~400 MB `google-cloud-sdk` cask, the `gws` install, `gws auth setup`, `gws auth login --services gmail --readonly`, the Desktop OAuth client provisioning and the test-user dance are all retired. The original decision, its probe transcripts and scripted-gcloud fallback notes are preserved below so the reasoning is traceable if we ever revisit OAuth (see ADR-024's "Revisit if" block). The IMAP pivot shipped and its roadmap doc was retired on 2026-04-23; see [`../current-state.md`](../current-state.md) § Retired phase docs.

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

> **Amended on 2026-04-22 by ADR-024.** The *principle* — surface privacy facts at every consent moment, keep them reachable forever through `slashcash privacy`, never gate on acknowledgement — is unchanged. The *moments* change: there is no `gcloud auth login` or `gws auth login` browser consent under ADR-024, so the `PRE_GCLOUD_AUTH`, `PRE_GWS_SETUP`, and `PRE_GWS_LOGIN` constants are deleted and replaced by a single `PRE_APP_PASSWORD_INPUT` block shown before the password prompt. `TOP_BANNER` and `FINAL_SUMMARY` are rewritten to describe keychain storage and IMAP connections instead of Google Cloud projects and refresh tokens. Snapshot tests regenerate in the same PR as the copy edit. The retired `roadmap/pivot-imap.md` § B4 (see [`../current-state.md`](../current-state.md) § Retired phase docs) documented the exact copy at the time of landing.

**Decision.** The privacy claims that make this product worth installing (local-only data, BYO Google Cloud project, no telemetry, loopback-only dashboard) are printed by the wizard at four moments: top-of-onboard banner, pre-`gcloud auth login` line, pre-`gws auth login` line, and final summary. They are reachable forever through `slashcash privacy`. The wizard also prints one operational safety note before `gws auth setup`: upstream `gws` may ask whether to run `gws auth login` immediately, and slashcash tells the user to answer `n` so the next step can request Gmail read-only access with `gws auth login --services gmail --readonly`. The wizard does not gate on acknowledgement; trust is built by showing the facts at the moments the user is deciding whether to click Allow. Copy and setup guidance live in one file, `packages/cli/src/privacy/copy.ts`, so the wizard and the standing command never drift.

**Why.** The developer audience (see `vision.md` "Target audience for v1") evaluates trust at the consent screen, not on a landing page. The product principle is "trust is surfaced, not buried", so onboarding itself has to say where data, tokens, PDFs, model calls and telemetry do or do not go.

**Rejected.** A single upfront dump (users skim it). Legal "I accept" checkboxes (wrong product). Printing only via a separate command (missed by the users who most need it).

**Revisit if.** ADR-022 changes to a verified shared Google client, if the hosted surface returns, or if any telemetry/version-check default changes. Any of those would require changing the copy and its snapshots in the same PR.

## ADR-024 — Gmail access via IMAP + user-issued app password

**Decision.** `slashcash onboard` does not install `gcloud`, does not install `gws`, and does not drive a Google OAuth flow. Instead, the wizard:

1. Asks the user for their Gmail address (`text` prompt).
2. Points them at <https://myaccount.google.com/apppasswords> to generate a 16-character app password.
3. Asks for that password (`password` prompt, spaces tolerated in input).
4. Tests an IMAP `LOGIN` against `imap.gmail.com:993` over TLS to validate the credential before writing it.
5. Persists the credential pair in the macOS Keychain through `keytar` (service `slashcash`, account `gmail-app-password@<email>`) or, as a clearly-flagged fallback when `keytar` is unavailable, in `~/.slashcash/credentials.json` with file mode `0600`.

Gmail ingest reads messages through IMAP (`imapflow`) using the Gmail `X-GM-RAW` extension for the skill query string, and parses MIME with `mailparser`. The rest of the Phase 2 pipeline (extraction, attachment persistence, dedupe, analytics, skills) is unchanged — only the carrier swaps.

**Why.** BYO-GCP + `gws` (ADR-004 + ADR-011 + ADR-022) bought us a clean "the user's Gmail token lives in their own Cloud project" story, but it charged the user a ~400 MB `google-cloud-sdk` cask, two browser consent screens, one "Google hasn't verified this app" warning, and a Cloud-Console-adjacent setup that materially hurt onboarding completion rates in dogfood. For a local-first single-user product, the dramatically simpler IMAP + app password flow is the right v1 trade: one URL, one paste, no cask, no project, no client, no test user. The credential still never leaves the user's machine; the privacy guarantees in ADR-023 still hold.

**Scope of access.** An app password grants full IMAP/SMTP access to the mailbox; we use IMAP read-only from our code and never open an SMTP connection. This is broader than an OAuth `gmail.readonly` scope (which ADR-022 could enforce at the Google side). We accept that trade and disclose it honestly in the onboarding banner. Users who need a stronger guarantee today can use a dedicated Gmail account for slashcash.

**Preconditions the wizard verifies or classifies.**

- 2-Step Verification must be enabled on the Google account (prerequisite for generating an app password).
- The Google Advanced Protection Program (APP) disables app passwords; incompatibility is classified as a distinct IMAP auth failure and the wizard tells the user v1 does not support APP.
- Workspace admins can disable app passwords; the classifier signals "policy-disabled" and points the user at a personal account.
- IMAP must be enabled in Gmail (default since January 2025); the wizard classifies the `[ALERT] Please log in via your web browser` failure and points the user at <https://mail.google.com/mail/u/0/#settings/fwdandpop>.

**Rejected.**

- **Keep ADR-022 (BYO-GCP + `gws`).** The install-friction cost is higher than the incremental trust gain for this audience. ADR-004's "Revisit if" block contemplated exactly this pivot.
- **OAuth device-flow with a shared verified client owned by us.** Still requires Google's OAuth app verification including CASA for the restricted scope, which ADR-004 rejected and nothing about the pivot changes that calculus.
- **SMTP-disabled app passwords.** Google does not offer scope-limited app passwords; this is not a toggle we can set.
- **Gmail API with user-pasted API keys.** Gmail does not issue user-scoped API keys for mail access.

**Revisit if.**

- We ever absorb Google's OAuth app verification track (privacy policy, domain verification, annual CASA). At that point ADR-024 is replaced by a new ADR defining a verified-client OAuth flow, ADR-004's revisit fires, and the wizard gains an OAuth path.
- Google discontinues app passwords for consumer accounts. The current signal is the opposite (they remain supported for 2FA-on accounts), but this is the single external dependency that could force a reversal.
- A meaningful fraction of target users turn out to be on APP or on Workspace tenants that disallow app passwords. In that case the "dedicated Gmail account" workaround is insufficient and we need a second auth path.

## ADR-025 — Interactive onboarding wizard on `@clack/prompts`

**Decision.** `slashcash onboard` uses `@clack/prompts` (^1.2.0) as its interactive shell, wrapped by a thin `WizardPrompter` interface modelled on `../openclaw/src/wizard/prompts.ts` and `../openclaw/src/wizard/clack-prompter.ts`. Step orchestration continues to live behind the `Step { detect / install / verify }` pipeline from the retired Phase 3 W1 workstream; the prompter replaces the old readline-based `packages/cli/src/cli/prompt.ts`. The wizard renders `intro` / grouped `note` / `select` / `text` / `password` / `confirm` / `spinner` at the moments defined in the retired `roadmap/pivot-imap.md` § B2 (see [`../current-state.md`](../current-state.md) § Retired phase docs and `git log -- packages/docs/roadmap/pivot-imap.md`).

**Why.** The current straight-line `onboard` ships none of the Phase 3 UX we promised: no progress line, no idempotent re-run, no grouped disclosures, no live `ollama pull` stream, no safe cancel. Openclaw has already absorbed the cost of discovering what a local-CLI setup wizard needs to look like, and `@clack/prompts` is the same primitive it uses. Re-deriving our own readline helpers from scratch is pointless duplication against ADR-016 ("continuously learn from openclaw").

**What we do not adopt.**

- `osc-progress` terminal escapes (openclaw ships them; we stay ASCII so logs render anywhere).
- Openclaw's plugin/sandbox/gateway prompt groups (different product surface).
- Direct copy of openclaw source — patterns only, per ADR-016.

**Rejected.**

- **Stay on readline.** Cheap to write, but we have already paid the cost of a readline-only helper and it's the reason the Phase 1/2 boundary audit (the retired `roadmap/audit-phase-1-2.md`, see git history) flagged the "block" items against onboarding. Continuing on that path re-spends the same effort for a worse result.
- **Adopt `inquirer` or `prompts`.** Both are fine; `@clack/prompts` is the pattern openclaw already proved out and gives us zero-cost parity with their `note`, `spinner` and cancel semantics.
- **Build an Ink-based UI.** Out of scale for a few-dozen-line wizard.

**Revisit if.** `@clack/prompts` is unmaintained or its API churns enough to break our thin adapter. The adapter contains the blast radius; we could swap to `prompts` with ~50 lines of change.

## ADR-026 — Docling as the local PDF invoice extractor

**Decision.** PDF attachments are extracted by [Docling](https://github.com/DS4SD/docling) (IBM, MIT-licensed), running fully locally in a Python 3.11+ venv at `~/.slashcash/py-venv`. Gemma over Ollama is no longer responsible for reading PDFs. Gemma continues to handle (a) email-body extraction, (b) the reconciliation pass that merges the body candidate with the Docling candidate into the authoritative `transactions_v2` row, and (c) the dashboard chat assistant.

The split pipeline, per ingested message, is:

1. Email body + inline images → Gemma `generateObject` against the merchant Zod schema.
2. Each `application/pdf` attachment → `python -m slashcash_pdf_extractor <path>` → validated JSON candidate.
3. Both candidates → Gemma merge pass with a merchant-specific reconciliation rules block → the final row.
4. If the PDF extractor is unavailable or fails on a given attachment, ingest degrades to body-only extraction and surfaces the Python lane state via `slashcash doctor`.

**Why.** `gemma3n:e4b` is tuned for chat and light structured output at ~3 GB of weights. PDF receipts (Swiggy in v1, bank statements later) carry totals, per-line items and tax breakdowns inside layout-aware tables that Gemma reads poorly — and today the repo does not even hand it the PDF bytes (see `slashAIV2.ts:30–52`, where attachments are described in prose to the model rather than shown). Docling is purpose-built for document understanding, reads tables correctly, runs offline, and is permissively licensed. Confining the model to deterministic fields (layout, text, tables) and letting Gemma do the softer "merchant field mapping + reconcile with the body" step is a cleaner division of labour than forcing Gemma to do both.

**Rejected.**

- **Keep Gemma + feed PDF bytes via base64 in the prompt.** The model still reads layouts poorly; `generateObject` calls regularly truncate long base64 payloads; and the per-call cost is higher for a worse result.
- **pdfplumber or PyMuPDF alone.** Both are lightweight and tempting, but they leave the "is this the total?" classification to us. Docling already handles table semantics and multi-column layouts; we would be reinventing a weaker version of Docling in our schema layer.
- **unstructured.io.** Good general extractor; less focused on invoice-shaped tables than Docling. Closer second than pdfplumber; revisit trigger is "Docling maintainership drops off".
- **Cloud OCR (AWS Textract, Google Document AI, Mistral OCR).** Violates the local-first posture in ADR-013 and the no-telemetry posture in vision.md § principles.
- **A long-lived Python sidecar over HTTP.** See ADR-027 — we chose per-PDF subprocess for v1; sidecar is the next-step promotion if latency becomes user-visible.

**Scope.** Docling is a deterministic text+table extractor, not a financial reasoner. The `slashcash_pdf_extractor` Python entry wraps it with a merchant adapter (v1: Swiggy) that maps the Docling output into our stable JSON schema. Adding another merchant is "write another adapter"; it is not an ADR-level decision.

**Revisit if.** Docling is discontinued or its license changes; reconciliation confidence on real dogfood runs stays below the ADR-012 threshold even with Docling-level PDF fields; or we add a merchant whose receipts are primarily image-only (then the adapter layer grows an OCR step or switches libraries, possibly per-merchant).

## ADR-027 — Python extractor as a per-PDF subprocess, venv bootstrapped by `doctor --fix`

**Decision.** Node calls the Python extractor via `child_process.spawn`, once per PDF, with a 30-second default timeout, against the interpreter at `~/.slashcash/py-venv/bin/python`. The venv is created and populated by `slashcash doctor --fix` from a pinned `packages/pdf-extractor/requirements.txt` (exact versions with SHA256 hashes, installed via `pip install --require-hashes`). The install state is tracked by a hash file at `~/.slashcash/py-venv/.slashcash.install-hash` so doctor re-runs `pip install` only when `requirements.txt` changes. No Python code ships inside the npm tarball; the Python package lives at `packages/pdf-extractor/` and `doctor --fix` installs it from the globally-installed CLI's `node_modules` copy.

The extractor is pure: `(pdf path) -> JSON on stdout`. Exit codes: `0` success, `1` deterministic extractor failure, `2` bad argv, `3` unexpected exception. Stderr is human-readable diagnostics only. The Node wrapper returns a `Result<PdfExtraction, PdfExtractError>` with a closed error union (`pdf-extractor-not-ready`, `pdf-extractor-timeout`, `pdf-extractor-crashed`, `pdf-extractor-bad-output`, `pdf-extractor-unsupported-format`, `pdf-extractor-empty`, `unknown`) and never throws.

**Why.** Three properties matter for this surface:

1. **No state leaks between calls.** A per-PDF subprocess gets a fresh Python interpreter; if Docling's internal caches ever misbehave, the blast radius is one email.
2. **No daemon lifecycle.** We already fought this battle with Trigger.dev and Supabase. Adding a long-lived `127.0.0.1:<port>` Python service re-introduces "is it up?", "is it the right version?", "did the user kill it?", plus a second healthz surface in doctor.
3. **Fork cost is not the bottleneck.** Ingest runs ≤ 50 messages per tick (see `SLASHCASH_SYNC_LIMIT` default) and runs every 15 minutes. A ~200ms Python cold start per PDF is imperceptible against the Gemma calls.

A pinned venv under `~/.slashcash/` (rather than a project-local `pnpm-packed` Python) is the only option that survives `npm i -g slashcash` on an end-user machine: the npm tarball cannot ship Python wheels portably, and installing into a globally-writable Python path fights macOS's "externally-managed-environment" PEP 668 shield. A per-user venv is the macOS-sanctioned answer.

**Rejected.**

- **Long-lived FastAPI / uvicorn sidecar on 127.0.0.1.** Better batch latency, but ADR-006's "one Node process" simplicity argument applies again here: a second supervised process on 127.0.0.1 is the exact complexity this product keeps avoiding. Promotion is the next step if per-PDF spawn ever dominates sync runtime.
- **pipx install as a user-global tool.** Works, but makes `slashcash doctor --fix` depend on another package manager (`pipx`) that itself needs installing. Native `python3 -m venv` is already on any Python 3 install.
- **Ship Python wheels inside the npm tarball.** Cross-architecture (Intel vs Apple Silicon) wheels for Docling's native deps are too fragile to embed; we would reinvent what `pip` already does. Also blows the npm-publish-with-provenance story.
- **Use `uv` from astral.** `uv` is excellent, but "add `uv` to the install chain" crosses a line: the user went from one brew dep (Ollama) to two (Ollama + Python 3) for this pivot; adding `uv` makes it three. Revisit if doctor-provisioned `pip install` reliably exceeds 90 seconds on normal broadband.
- **Run the extractor via `pnpm` or tsx as a Node-hosted Python interpreter (PyOdide, RustPython).** No Docling support; not a serious option.

**Install story that the user actually sees.**

- First `slashcash onboard` on a clean machine includes a `python-env` step in the wizard that runs the same code as `doctor --fix`: detect `python3 --version`, create the venv if missing, `pip install --require-hashes -r requirements.txt`. The step shows a single spinner line `Installing PDF extractor (~60s first time, cached after)`.
- On subsequent `slashcash start` / `slashcash sync` runs, the CLI checks the install-hash file cheaply (no `pip` call); if it matches, the lane is ready immediately.
- If Python 3 itself is missing, the error block points at `brew install python@3.12`. We do not auto-install Python; the user retains control over their system Python installation.

**Revisit if.**

- Per-PDF spawn cost ever dominates a sync tick (measure via `slashcash logs --filter extract.pdf`; budget is ≤ 20% of sync wall time). Promotion target: long-lived sidecar behind an in-process IPC shim.
- `pip install` reliably takes longer than 90 seconds on a normal broadband link (switch to `uv`).
- Python 3 becomes non-trivial to obtain on macOS (unlikely; Xcode CLT ships Python 3, brew ships current Python).
- A meaningful fraction of users end up on PEP 668-locked Python installs that also refuse `python -m venv` (no signal of that today on macOS).
