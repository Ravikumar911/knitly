# Reference — CLI command surface

The `slashcash` binary is the product. This document describes every command, what it does, and when in the roadmap it lands. Command implementations live under `packages/cli/src/cli/registry/`.

## Conventions

Every command accepts the global flags `--help` and `--version`. Every command returns 0 on success, 1 on a recoverable failure that the user can fix, and 2 on a user error (bad arguments, unknown subcommand). Errors print three lines: symptom, cause, and the one command to run. There is no verbose mode; logs live in `~/.slashcash/logs/` and are inspectable with `slashcash logs`.

## `slashcash onboard`

Interactive first-run wizard. Lands in Phase 2. Detects or installs Homebrew, installs Ollama, pulls `gemma3n:e4b`, installs `gws`, runs `gws auth login`, creates `~/.slashcash/` with correct permissions, writes a default config, runs SQLite migrations, installs and enables the bundled `gmail-swiggy` skill. Idempotent; re-running after success is a quick no-op. Cancel-safe; a Ctrl-C leaves the machine in a state that `slashcash doctor --fix` can resume.

Flags: none in v1. Future `--skip-brew`, `--skip-gws`, `--model <id>` are out of scope.

## `slashcash start`

Boots the dashboard and the cron worker in one Node process. Phase 1 starts a Next.js server pinned to `127.0.0.1` at the configured port, writes a PID file, registers an empty cron schedule, probes `/api/healthz`, and opens the browser. Phase 2 adds the real Gmail ingest job to the cron schedule by way of the enabled skills. SIGINT or SIGTERM shuts the Next.js child and the cron gracefully, clears the PID file, and exits.

Flags: `--port <n>` overrides the config port for this run; `--no-cron` suppresses cron registration (useful for development); `--no-open` suppresses the browser launch.

## `slashcash stop`

Reads the PID file, sends SIGTERM, waits up to a short grace window, falls back to SIGKILL if necessary, clears the PID file. Exits non-zero if no PID file is present or the PID does not belong to a `slashcash` process.

## `slashcash status`

Prints a small table: PID (or `not running`), port, healthz status, DB path, attachments path, number of enabled skills. Exits zero always; the contents communicate state.

## `slashcash doctor`

Runs a battery of checks against the host and the state directory. Phase 1 checks the Node version, `~/.slashcash/` existence and permissions, the SQLite file, migrations up-to-date, Ollama reachability. Phase 2 adds checks for `gws` installed, `gws auth status`, `gemma3n:e4b` (and optionally the vision model) pulled, required binaries for each enabled skill, port free, config schema drift, stale PID file.

Flags: `--fix` applies repairs for every check that has one. `--json` emits a machine-readable report. `--quick` skips network probes (`ollama`, `gws auth`). Every repair is idempotent.

## `slashcash config get|set|path`

Reads and writes `~/.slashcash/config.json`. `get <key>` prints one value (or the whole config if no key is given). `set <key> <value>` validates against the config schema, writes back atomically, and prints the new value. `path` prints the absolute path to the config file.

Values are typed by the schema; numeric, boolean and string coercions are applied before validation. Unknown keys return a non-zero exit with a suggested nearest-match.

## `slashcash sync`

Kicks the Gmail ingest job immediately, bypassing the cron schedule. Acquires the same mutex that cron uses, so two syncs can never run at once. Lands in Phase 2.

Flags: `--full` ignores the `since` watermark and processes the full inbox query; `--since <iso>` overrides the watermark with an explicit timestamp. Exits non-zero if `gws` is missing or not authenticated, with a pointer to `slashcash doctor --fix`.

## `slashcash skills list|enable|disable`

Manages installed skills. Lands in Phase 2. `list` enumerates every folder under `~/.slashcash/skills/` with a valid manifest, showing id, version, category, enabled state, and required-binary health. `enable <id>` and `disable <id>` flip the enabled flag in `config.json` and either register or unregister the skill's jobs with the running worker (if any).

## `slashcash db seed|reset`

Developer-facing database commands. Lands in Phase 1. `seed` populates the SQLite file with deterministic fixtures. `reset` deletes the SQLite file and the `attachments/` directory, reruns migrations, and reapplies the seed. Prompts for confirmation unless `--yes` is passed.

## `slashcash logs`

Tails `~/.slashcash/logs/slashcash.log`. Lands in Phase 2.

Flags: `-f` follows new lines. `--since <iso>` filters by timestamp. `--level <info|warn|error>` filters by level.

## `slashcash version`

Prints the package version and exits. Implemented as a fast path in the entry shim so cold invocation does not load Commander.

## Exit codes

0 on success. 1 on a recoverable failure that the user can act on. 2 on bad arguments. 3 on an internal invariant violation (bug — we want to see these in issue reports).
