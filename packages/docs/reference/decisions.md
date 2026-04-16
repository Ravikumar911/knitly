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

**Decision.** We never ship a Google OAuth client id. We never handle Google tokens. The user runs `gws auth login` during `slashcash onboard`, and `gws` owns everything about Google authentication and API access.

**Why.** This is the single biggest trust improvement over the hosted SaaS. The user's Google credentials never touch our code. `gws` is maintained by Google Workspace's team and keeps current with API changes.

**Rejected.** An installed-app OAuth flow using our own client id — we'd be back to owning refresh tokens. IMAP with an app password — weaker auth, no attachment API, deprecated direction.

**Revisit if.** `gws` ever becomes unmaintained or diverges from Google's current APIs in a way that breaks our use case.

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

## ADR-011 — `gws` install method

**Decision.** `gws` is installed through Homebrew using whichever tap is the upstream-blessed source at the time of the Phase 2 W1 kickoff. The exact tap and formula name are captured here and referenced from a single constant in the code so any change is a one-file update.

**Why.** `gws` distribution is evolving. Rather than hard-coding a tap across the codebase, we keep it in one place.

**Revisit on every Phase 2 W1 touch.** If the upstream distribution moves, update this ADR and the constant.

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
