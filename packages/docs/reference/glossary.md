# Reference — Glossary

Short definitions for the terms that show up across the plan.

**slashcash.** The npm package and the CLI that ships it. Global bin: `slashcash`.

**`slash.cash` / `app.slash.cash`.** The hosted SaaS we are pivoting away from. The landing site at `slash.cash` stays and is repointed at the CLI at the end of Phase 2; the app subdomain is retired.

**local-first.** The design stance that all user data, compute and credentials live on the user's own machine, and the product is useful with no remote services after onboarding.

**single-user.** The product assumes one human on one machine. No logins, teams, roles or sync.

**loopback.** The `127.0.0.1` address. The only interface the Next.js server binds to. The authentication boundary for the local app.

**onboard.** The one-time interactive setup flow started by `slashcash onboard`. Provisions Homebrew, Ollama, the model, `gws`, and the state directory.

**doctor.** The self-diagnostic and self-repair flow started by `slashcash doctor` (and `doctor --fix`). Every failure mode that has a known repair is resolved here rather than silently on startup.

**state directory.** `~/.slashcash/`. Holds `config.json`, `db.sqlite`, `attachments/`, `logs/`, `pid/` and `skills/`. Overridable via `SLASHCASH_HOME`.

**config.** The contents of `~/.slashcash/config.json`, validated against the schema at load time. Documented in `reference/config.md`.

**skill.** A folder under `~/.slashcash/skills/` that extends what the app can do. Declares required binaries and cron jobs in a manifest; described in `reference/skills.md`. The only bundled skill in Phase 2 is `gmail-swiggy`.

**Ollama.** The local model server the product depends on. Installed and started through Homebrew during `onboard`. Reachable at its default loopback port.

**gemma3n:e4b.** The Ollama tag for the Gemma 3n E4B model. Default chat and vision model for the local app.

**`gws`.** The Google Workspace CLI. Used as a subprocess for every Gmail operation. Owns Google authentication, refresh tokens and API access; we do not.

**AI SDK.** Vercel's `ai` package used by the existing code. We keep it and point it at Ollama through its OpenAI-compatible adapter.

**Drizzle.** The ORM we keep. In the new codebase it targets SQLite through `drizzle-orm/better-sqlite3`.

**tRPC.** The API layer between the Next.js dashboard and the server. Routers are kept; the tRPC context becomes a simple local user.

**node-cron.** The in-process scheduler that runs the Gmail ingest job every fifteen minutes by default.

**single-flight.** The property that the ingest job never runs concurrently with itself. Enforced by a module-level mutex.

**job registry.** The runtime object that maps job ids to async functions. Skills contribute jobs; the cron schedule picks jobs from the registry at start time.

**PID file.** `~/.slashcash/pid/slashcash.pid`. Lets `slashcash stop` and `slashcash status` find the running process.

**standalone output.** Next.js's bundling mode that produces a self-contained server tree. Used by the release workflow so the published CLI does not need to build the Next.js app on the user's machine.

**ADR.** Architecture decision record. One per decision, kept in `reference/decisions.md`.

**openclaw.** The reference CLI we borrow architectural patterns from (entry shim, command catalog, doctor repair sequencing, state directory conventions). No code is copied; only patterns.
