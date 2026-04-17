# Reference — CLI command surface

The `slashcash` binary is the product. This document describes every command, what it does, and when in the roadmap it lands. Command implementations live under `packages/cli/src/cli/registry/`.

## Conventions

Every command accepts the global flags `--help` and `--version`. Every command returns 0 on success, 1 on a recoverable failure that the user can fix, and 2 on a user error (bad arguments, unknown subcommand). Errors print three lines: symptom, cause, and the one command to run. There is no verbose mode; logs live in `~/.slashcash/logs/` and are inspectable with `slashcash logs`.

## `slashcash onboard`

Interactive first-run wizard. Prints the privacy disclosure banner (same copy as `slashcash privacy`, see ADR-023), detects Homebrew, installs Ollama, pulls `gemma3n:e4b`, installs gcloud (`brew install --cask google-cloud-sdk`), runs `gcloud auth login` (printing the pre-consent line first), installs `gws`, runs `gws auth setup` against the active gcloud project to provision a per-user OAuth client, runs `gws auth login --scopes gmail.readonly` (printing the pre-consent line first), creates `~/.slashcash/` with correct permissions, writes a default config, runs SQLite migrations, installs and enables the bundled `gmail-swiggy` skill, and prints the final-summary block that restates what is and isn't on the user's disk. Implements ADR-022. Idempotent; re-running after success is a quick no-op. Cancel-safe; a Ctrl-C leaves the machine in a state that `slashcash doctor --fix` can resume.

Flags: `--yes` accepts the default model choice, `--non-interactive` fails instead of prompting, and `--dry-run` prepares local state and skips host installs/auth. The E2E-only `--skip-external` and `--skip-auth` flags are hidden unless `SLASHCASH_E2E=1` is set.

## `slashcash start`

Boots the dashboard and the cron worker in one Node process. Starts a Next.js server pinned to `127.0.0.1` at the configured port, writes a PID file, registers the Gmail ingest cron schedule for enabled skills, probes `/api/healthz`, and opens the browser. SIGINT or SIGTERM shuts the Next.js child and the cron gracefully, clears the PID file, and exits.

Flags: `--port <n>` overrides the config port for this run; `--no-open` suppresses the browser launch.

## `slashcash stop`

Reads the PID file, sends SIGTERM, waits up to a short grace window, falls back to SIGKILL if necessary, clears the PID file. Exits non-zero if no PID file is present or the PID does not belong to a `slashcash` process.

## `slashcash status`

Prints a small table: PID (or `not running`), port, healthz status, DB path, attachments path, number of enabled skills. Exits zero always; the contents communicate state.

## `slashcash doctor`

Runs a battery of checks against the host and the state directory. Phase 1 checks the Node version, `~/.slashcash/` existence and permissions, the SQLite file, migrations up-to-date, Ollama reachability. Phase 2 adds checks for `gws` installed, `gws auth status`, `gemma3n:e4b` (and optionally the vision model) pulled, required binaries for each enabled skill, port free, config schema drift, stale PID file.

Flags: `--fix` applies repairs for every check that has one. `--json` emits a machine-readable check array. `--quick` skips network probes (`ollama`, `gws auth`). Every repair is idempotent.

## `slashcash config get|set|path`

Reads and writes `~/.slashcash/config.json`. `get <key>` prints one value (or the whole config if no key is given). `set <key> <value>` validates against the config schema, writes back atomically, and prints the new value. `path` prints the absolute path to the config file.

Values are typed by the schema; numeric, boolean and string coercions are applied before validation. Unknown keys return a non-zero exit with a suggested nearest-match.

## `slashcash sync`

Kicks the Gmail ingest job immediately, bypassing the cron schedule. Acquires the same mutex that cron uses, so two syncs can never run at once.

Flags: `--full` scans the configured Gmail query from the beginning, `--query <query>` overrides `sync.gmailQuery`, and `--limit <n>` overrides `sync.maxMessages`. Exits non-zero if `gws` is missing, unauthenticated, or the `gmail-swiggy` skill is disabled.

## `slashcash skills list|enable|disable`

Manages installed skills. `list` enumerates every folder under `~/.slashcash/skills/` with a valid manifest, showing id, version, description, and enabled state. `enable <id>` and `disable <id>` flip the enabled flag in `config.json`.

## `slashcash db seed|reset`

Developer-facing database commands. Lands in Phase 1. `seed` populates the SQLite file with deterministic fixtures. `reset` deletes the SQLite file and the `attachments/` directory, reruns migrations, and reapplies the seed. Prompts for confirmation unless `--yes` is passed.

## `slashcash logs`

Reads structured JSONL logs from `~/.slashcash/logs/<YYYY-MM-DD>.log`.

Flags: `--tail <n>` controls the number of events shown, `--follow` / `-f` follows new events, `--filter <area>` filters comma-separated areas such as `cron,ingest`, `--since <duration>` accepts values like `5m`, `1h` or `2d`, `--json` emits raw JSON events, and `--level <debug|info|warn|error>` sets the minimum level.

## `slashcash privacy`

Prints the same plain-language privacy statement the onboarding wizard shows at the top of `slashcash onboard` — the six factual bullets about where your Gmail token, emails, PDFs and analytics live, the local-only parsing model, the loopback dashboard, and the no-telemetry guarantee. Exists so the statement is reachable forever after onboarding, not just during it.

No flags. Always exits 0. The copy is imported from `packages/cli/src/privacy/copy.ts`, the same module the wizard uses, so the two surfaces can never drift. See ADR-023 for why this command exists and `reference/architecture.md` for the corresponding data-flow diagram.

## `slashcash version`

Prints the package version and exits. Implemented as a fast path in the entry shim so cold invocation does not load Commander. By default this command is silent beyond the version string. Users can opt into a once-per-day npm latest check with `slashcash config set updates.checkOnVersion true`; the cached result lives under `~/.slashcash/cache/`.

## Exit codes

0 on success. 1 on a recoverable failure that the user can act on. 2 on bad arguments. 3 on an internal invariant violation (bug — we want to see these in issue reports).
