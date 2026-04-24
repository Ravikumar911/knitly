# Reference — CLI command surface

The `slashcash` binary is the product. Command implementations live under `packages/cli/src/cli/registry/`.

## Conventions

Every command accepts the global flags `--help` and `--version`. Success exits `0`. Recoverable runtime failures exit `1` and print the standard `error[area] / cause / fix` block. Bad arguments exit `2`. Logs live under `~/.slashcash/logs/` and are inspectable with `slashcash logs`.

## `slashcash onboard`

Interactive first-run wizard backed by `@clack/prompts` and the `Step { detect / install / verify }` pipeline. It:

1. Prints the privacy banner.
2. Verifies Homebrew.
3. Lets the user pick a local chat model (default `gemma3n:e4b`).
4. Detects or installs Ollama, starts the service, and pulls the chosen model.
5. Prompts for a Gmail address.
6. Shows the app-password note and prompts for a 16-character Gmail app password.
7. Verifies IMAP login against `imap.gmail.com:993` before saving credentials.
8. Creates `~/.slashcash/`, migrates SQLite, and installs bundled skills.
9. Provisions `~/.slashcash/py-venv/` from the pinned `packages/pdf-extractor/requirements.txt` (reuses the `python-env` repair code that `slashcash doctor --fix` calls).
10. Prints the final summary.

The wizard is idempotent: rerunning on an already-configured machine is a fast no-op summary. Cancellation is safe; the user can rerun `slashcash onboard` or `slashcash doctor --fix`.

Flags:

- `--yes` accepts safe defaults, but still prompts for Gmail credentials because they have no safe default.
- `--non-interactive` fails instead of prompting.
- `--dry-run` prepares local state, skips host installs, and skips IMAP credential prompts.
- `--skip-external` is an E2E-only flag hidden unless `SLASHCASH_E2E=1`.

## `slashcash start`

Boots the dashboard and the cron worker in one Node process. Starts the Next.js server pinned to `127.0.0.1`, writes a PID file, registers cron jobs for enabled skills, probes `/api/healthz`, and optionally opens the browser.

Flags:

- `--port <n>` overrides the configured port for one run.
- `--no-open` suppresses the browser launch.

## `slashcash stop`

Reads the PID file, sends SIGTERM, waits briefly, escalates to SIGKILL if needed, and clears the PID file. Exits non-zero if no matching running process exists.

## `slashcash status`

Prints a small table with PID, port, health, DB path, attachments path, and enabled-skill count. Always exits `0`; the table contents communicate state.

## `slashcash doctor`

Runs host and local-state checks:

- Node version
- state directory
- config schema
- sync schedule
- Gmail credential presence
- SQLite database
- bundled skills
- Ollama reachability and model pull status
- Gmail IMAP login verification
- Python environment for the PDF extractor (interpreter ≥ 3.11, venv at `~/.slashcash/py-venv`, pinned `pip install` hash matches, `python -m slashcash_pdf_extractor --version` succeeds)

Flags:

- `--fix` recreates missing local state, installs bundled skills, and provisions / re-provisions `~/.slashcash/py-venv` from the pinned `requirements.txt` when the install-hash file at `~/.slashcash/py-venv/.slashcash.install-hash` is missing or stale.
- `--json` emits the machine-readable check array.
- `--quick` skips network probes (`ollama`, `gmail-imap`) and the `python-env` import smoke test (venv presence is still checked cheaply).
- `--reset-credentials` deletes saved Gmail IMAP credentials before rerunning checks.

## `slashcash reset`

Resets local slash.cash state while keeping the CLI installed. It stops the dashboard if it is running, clears the saved Gmail credential, removes `~/.slashcash/`, and deletes a custom SQLite path too if `SQLITE_DB_PATH` points outside the state directory.

Flags:

- `--yes` is required so the reset cannot happen accidentally.

After reset, rerun `slashcash onboard`.

## `slashcash config get|set|path`

Reads and writes `~/.slashcash/config.json`. `get <key>` prints one value or the whole config. `set <key> <value>` coerces booleans and numbers, validates against the schema, writes back, and prints the new value. `path` prints the config file path.

## `slashcash sync`

Runs the Gmail ingest job immediately, bypassing cron. Acquires the same single-flight mutex the cron worker uses, so two syncs can never overlap.

Flags:

- `--full` scans the configured Gmail query from the beginning.
- `--query <query>` overrides `sync.gmailQuery`.
- `--limit <n>` overrides `sync.maxMessages`.

Exits non-zero if the bundled `gmail-swiggy` skill is disabled, credentials are missing, or Gmail IMAP rejects the saved credential.

## `slashcash skills list|enable|disable`

Manages installed skills under `~/.slashcash/skills/`. `list` prints id, version, description, and enabled state. `enable <id>` / `disable <id>` flip the config flag; cron reads that flag before each run.

## `slashcash db seed|reset`

Developer-facing SQLite helpers. `seed` populates deterministic fixtures. `reset` deletes the SQLite file and attachments directory, reruns migrations, and reapplies the seed. Prompts for confirmation unless `--yes` is passed.

## `slashcash logs`

Reads structured JSONL logs from `~/.slashcash/logs/<YYYY-MM-DD>.log`.

Flags:

- `--tail <n>`
- `--follow` / `-f`
- `--filter <area>`
- `--since <duration>`
- `--json`
- `--level <debug|info|warn|error>`

## `slashcash privacy`

Prints the same privacy statement used by onboarding. The copy comes from `packages/cli/src/privacy/copy.ts`, so the wizard and the standalone command cannot drift.

## `slashcash version`

Prints the package version via the fast path in the entry shim. Users can opt into a cached once-per-day npm latest check with `slashcash config set updates.checkOnVersion true`.

## Exit codes

- `0` success
- `1` recoverable runtime failure
- `2` bad arguments
- `3` internal invariant violation
