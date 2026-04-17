# Architecture — target state

This is what we are building. Phase 2 delivers this picture in full; Phase 1 delivers a strict subset of it (CLI skeleton, SQLite, local model wiring, no real Gmail ingest yet).

## One-paragraph picture

The user installs `slashcash` from npm. `slashcash onboard` provisions every host dependency — Homebrew, Ollama, the `gemma3n:e4b` model, `gcloud`, the `gws` Google Workspace CLI, `gws auth setup`, and the scoped `gws auth login --scopes gmail.readonly` consent. `slashcash start` boots the existing Next.js dashboard on `127.0.0.1` at a configured port inside a single Node process. That same process runs an in-process `node-cron` worker that shells out to `gws` to pull Gmail, parses messages and PDFs with `gemma3n:e4b` served by the local Ollama daemon, writes results to a single SQLite file at `~/.slashcash/db.sqlite` and puts PDF attachments on disk under `~/.slashcash/attachments/`. The Next.js dashboard reads from the same SQLite file through the same Drizzle schema and tRPC routers. There is no authentication in the app; loopback bind is the boundary.

## Process model

One Node process runs two cooperating subsystems. The first is the Next.js server, bound to `127.0.0.1` at the configured port. The second is the cron worker, ticking on a user-configurable schedule, running the Gmail ingest job one at a time behind a single in-process mutex. Both share one SQLite connection, one module graph, one logger. Two external processes are involved: the `ollama` daemon (a Homebrew service the user runs, not something our package starts or stops), reachable over loopback at its default port; and `gws`, invoked per Gmail call as a short-lived subprocess, inheriting a JSON stdout that we parse and validate.

If isolating the worker ever becomes necessary — for example because a PDF parse blocks too long — we promote it to a child Node process with IPC. For v1, co-hosting is the simpler choice and is sufficient for one user's inbox.

## Why this shape

Everything else in the design follows from three facts. First, the user is alone on the machine, so we don't carry an auth story. Second, the data volume is one person's inbox, so we don't need a server database, a queue or a worker fleet. Third, we don't want to own anyone's credentials, so Google auth belongs entirely to `gws`.

## The `slashcash` CLI

A new workspace package, `packages/cli`, ships the `slashcash` bin on npm. The CLI itself is small; its job is to delegate to the Next.js server, the cron worker, and a couple of host tools. The top-level command surface is: `onboard`, `start`, `stop`, `status`, `doctor`, `config`, `sync`, `skills`, `logs`, `db`, `version`. Subcommands are lazy-loaded so the cold path (help, version) is sub-hundred-millisecond. The entry shim pattern — a tiny `.mjs` that checks Node version and dynamically imports the compiled entry — is borrowed directly from the openclaw project. Every external boundary (argv, config, subprocess stdout) is validated with a schema before it enters typed code, and every shell-out returns a closed-code `Result` rather than a stringly-typed error.

Full command-level detail, flags and exit codes are documented in `reference/cli.md`.

## The Next.js app

The existing `apps/main` is the dashboard. It stays where it is. The pivot edits it in three places. First, Supabase is removed: the `apps/main/supabase/*` files, the middleware redirect, the auth-dependent pages under `app/(auth)/`, the OAuth callback route and the `components/auth/*` tree are deleted; the tRPC context uses a static local `userId`; middleware becomes a no-op. Second, the AI SDK provider under `app/api/assistant/route.ts` and inside `packages/tasks` is rewired to a single local provider that targets Ollama's OpenAI-compatible endpoint. Third, the raw-SQL agent tools under `lib/ai/tools/` are replaced by typed, Drizzle-backed tools, because the new dialect is SQLite and we don't want a prompt-level contract with JSONB-flavoured SQL. Everything else in the Next.js app — the dashboard pages, the transaction list, the assistant UI, the settings surface — keeps working against the new data source without changes.

For distribution, the Next.js app is built in "standalone" mode and the resulting tree is bundled inside the published `slashcash` package. The CLI spawns it with the hostname pinned to `127.0.0.1` and the port from config.

## The database

`packages/database` becomes a SQLite package. Drizzle is retained; the dialect changes. A new schema folder mirrors the existing one using `sqlite-core`: `uuid` columns become `text` with application-side UUIDs, `serial` becomes auto-increment integers, timestamps become millisecond integers, `jsonb` becomes JSON-mode text columns, `decimal` / `doublePrecision` become `real` (we decide at the start of Phase 1 whether to represent money as `real` or as a high-precision `text` — see `reference/decisions.md` ADR-010). The `auth` schema prefix disappears. Tables that existed only to serve auth or stored Google tokens (`auth.users`, `user_google_tokens`, `token_access_logs`, and a pared-down `profiles`) go away.

The query layer is mostly dialect-neutral at the call-site level, so most files compile unchanged once the dialect is switched. The real porting cost is concentrated in one module — `queries/insights/swiggyAnalytics.ts` — which is rewritten in Phase 2 using a mixture of SQLite JSON1 operators and app-side aggregation. Small `ilike`/`LEAST`/numeric-cast usages in other query files are straightforward swaps. Raw SQL generated by the assistant is eliminated entirely; the assistant gets a fixed catalogue of typed Drizzle-backed tools instead.

The DB file lives at `~/.slashcash/db.sqlite`. Drizzle's migration output targets this file. Migrations run at start time only after `slashcash doctor --fix` has green-lit the environment; startup never mutates user data silently.

## The cron worker

`packages/tasks` sheds Trigger.dev and becomes a plain library of job functions consumed by two callers: the `node-cron` schedule registered at CLI start, and the `emails.initiateSync` tRPC procedure for "sync now" buttons. The existing `processEmails` / `processEmailBatch` / dedupe units map to three plain async functions — call them `runEmailSync`, `runEmailBatch`, `runDuplicateDetection` — sharing one module-level mutex so that cron ticks and UI-triggered syncs never overlap. The Trigger-specific primitives (`batch.triggerByTaskAndWait`, `wait.until`, the `schedules.task` export) are replaced by straight iteration, cancelable timeouts, and a cron schedule string in `config.json`. Nothing calls Trigger; the `@trigger.dev/sdk` dependency is removed at the end of Phase 2.

## The Ollama integration

Ollama runs as a Homebrew service on the user's machine, listening on its default loopback port. Our package never starts or stops that daemon — `slashcash doctor` checks it's reachable and points the user at the right Homebrew command if not. The AI SDK is wired through its OpenAI-compatible adapter, pointed at Ollama's base URL, pinned to `gemma3n:e4b` for chat by default. PDF parsing uses the same model's vision capability at first; if eval quality falls short, a dedicated VLM (a `qwen2.5vl` or `llava` variant pulled by `onboard`) takes over, and the model id becomes a config value rather than a hard-coded string. The selection point is a single provider module that the assistant route, the tasks package and the evals all import.

## The `gws` Gmail ingress

Gmail reads happen through `gws`. We shell out per call — listing messages for a query, fetching each message, paging through results — parse `--format json` output, and validate the shapes with a schema at the boundary. A thin TypeScript wrapper module isolates `gws` from the rest of the codebase; callers work in typed domain objects, never raw JSON. Known error states — `gws` missing from `PATH`, user not authenticated, rate-limited, unknown — map to a closed error-code union that the CLI and the UI render into actionable messages. The old `gmailApi.ts` / `googleAuth.ts` / `user_google_tokens` tree is deleted; we do not keep a fallback Google-token path.

The user runs `gcloud auth login`, `gws auth setup`, and `gws auth login --scopes gmail.readonly` during `slashcash onboard`; `gws` stores its own refresh tokens in its own state directory, under the user's home, outside anything our package writes. We never read, store, or proxy those tokens.

## Attachments

PDF attachments extracted from Gmail are written to `~/.slashcash/attachments/` with a filename derived from the email id, and their absolute path is recorded in `parsed_emails`. The dashboard's PDF viewer, which previously fetched a Supabase signed URL, now fetches from a small Next.js route at `/api/attachments/<id>` that looks the row up in SQLite, resolves the on-disk path, enforces that the resolved path sits inside the attachments root, and streams the file. The client-side URL contract in the PDF viewer component barely changes.

## The config and state directory

Everything user-facing lives under `~/.slashcash/`. There is a single `config.json` validated by a schema on load, a SQLite database, an `attachments/` tree, a `logs/` tree with rotated structured logs, a `pid/` file that lets `slashcash status` and `slashcash stop` talk to the running process, and a `skills/` tree. The exact layout, defaults, and every config key are documented in `reference/config.md`.

Configuration changes from `slashcash config set ...` are validated against the same schema before being written back; `slashcash doctor --fix` is the owner of any migrations when the schema gains a field or renames one. Startup itself never rewrites user config.

## The skills system

A skill is a folder under `~/.slashcash/skills/` containing a human-readable runbook (`SKILL.md` with YAML frontmatter) and a machine-readable `manifest.json`. Manifests declare the binaries the skill needs on `PATH`, the cron jobs the skill registers with the worker, and a version. The CLI's `skills` subcommand lists, enables and disables skills, and the `doctor` pipeline checks required binaries for each enabled skill. Phase 2 ships one bundled skill — the Gmail-Swiggy ingester — which `onboard` installs and enables. The discovery rules, manifest schema and authoring guidelines are in `reference/skills.md`.

No versioned plugin SDK, sandboxing, or npm-installable skill packages in v1. Those are v2 topics.

## Networking and security posture

The Next.js server binds to `127.0.0.1` explicitly, not `localhost`, so IPv6 dual-stack can't surprise us. There is no authentication — loopback is the boundary. There is no telemetry, no auto-updater, and no outbound version check unless the user explicitly opts in with `updates.checkOnVersion`. Outbound calls during normal operation are limited to Ollama on loopback and `gws` contacting Google with the user's own credentials. Attachment URLs never accept a filesystem path from the client; resolution goes through a DB id lookup and a strict root-prefix check.

## Failure modes and how doctor handles them

Every enumerated failure mode has a `doctor` check and, where an automatic fix exists, a `doctor --fix` repair. Ollama not running is fixed by a Homebrew service start; the model not pulled is fixed by an `ollama pull`; `gcloud` missing is fixed by the Homebrew cask install; `gcloud` not authenticated launches `gcloud auth login --brief --no-update-adc`; `gws` missing is fixed by `brew install googleworkspace-cli`; `gws` setup/auth problems launch `gws auth setup` or `gws auth login --scopes gmail.readonly` interactively; the config directory missing is fixed by creating it with correct permissions; a stale PID file is cleared; config schema drift applies the new defaults and writes back; SQLite migration drift runs the pending Drizzle migration. The port-in-use case is surfaced but not auto-fixed; the user picks another port with `--port` or via config. The full matrix is in `reference/config.md` (alongside the config schema it protects).

## What we are not building in v1

No desktop GUI. No Docker compose. No pluggable queue. No multi-LLM provider abstraction. No multi-user, sync or team features. No Windows or Linux. No cloud fallback.
