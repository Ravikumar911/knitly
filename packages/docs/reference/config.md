# Reference — Config and state directory

All user state lives under `~/.slashcash/`. This document describes the layout, the config keys, and the migration policy. Everything is validated by a schema at load time; the schema itself lives in `packages/cli/src/config/schema.ts`.

## Directory layout

- `config.json` — the user-editable configuration. Validated on every load.
- `db.sqlite` — the Drizzle-managed SQLite database.
- `attachments/` — PDF attachments extracted by the Gmail ingest path. One file per email id.
- `cache/` — small local cache files such as the opt-in npm version check result.
- `logs/` — structured JSON logs. Rotated daily and when a file exceeds 10 MB, with 14-day retention.
- `pid/slashcash.pid.json` — PID file for the running `slashcash start` process.
- `skills/` — installed skills, one folder per skill id.

The directory is created with permissions that make it readable and writable only by the user. `slashcash doctor --fix` enforces this; if the directory or any child has wider permissions, the fix narrows them.

## Config keys

Keys are grouped. Each key has a documented default; unspecified keys fall back to defaults. Writing a key that does not exist in the schema returns a non-zero exit from `slashcash config set`.

**`server.host`** — the loopback host the Next.js server binds to. Default `127.0.0.1`.

**`server.port`** — the loopback port the Next.js server binds to. Default `3000`. Must be between 1024 and 65535.

**`ai.ollamaBaseUrl`** — the base URL of the Ollama OpenAI-compatible endpoint. Default `http://127.0.0.1:11434/v1`. Overrideable by the environment variable `OLLAMA_BASE_URL` for debugging; the config value wins once set.

**`ai.chatModel`** — the model id used by the chat assistant. Default `gemma3n:e4b`. The model must be present in the Ollama daemon; `slashcash doctor` checks this.

**`ai.visionModel`** — the model id used for PDF parsing. Default `gemma3n:e4b`. If Phase 2 W6 concludes that a dedicated VLM is needed, the recommended default becomes whichever model ADR-012 records.

**`sync.schedule`** — a cron expression. Default `*/15 * * * *`. Validated against the set of expressions `node-cron` accepts.

**`sync.gmailQuery`** — the Gmail search query used by the bundled `gmail-swiggy` skill. Default `from:(swiggy.in) newer_than:365d`.

**`sync.maxMessages`** — maximum Gmail messages inspected by a sync run. Default `50`.

**`skills.enabled.<id>`** — boolean, one per installed skill. Default `true` for `gmail-swiggy` when installed by `onboard`; default `false` for skills dropped in manually.

**`updates.checkOnVersion`** — boolean. Default `false`. When true, `slashcash --version` checks the npm `latest` dist-tag at most once per day, caches the answer under `cache/`, and prints a short update hint if a newer package exists.

There is no separate cron enabled flag in the current schema. Disable the contributing skill, for example `slashcash skills disable gmail-swiggy`, when you want only manual sync behavior.

There is also no Google Cloud project id key in v1. The current upstream `gws auth setup` probe (ADR-022, 2026-04-17) found a `--project` flag but no setup-time flags for API/scope list or test-user email, so project selection remains owned by `gws` and the active gcloud configuration rather than slashcash config.

## Migration policy

Config migration is currently handled on load: when the schema gains a field, the CLI parses the file with defaults and writes the completed config back. `slashcash doctor --fix` also recreates missing local state and installs bundled skills.

When the schema renames or removes a field, the repair path should move or delete the old key explicitly. Hand-editing `config.json` remains supported, and `slashcash config set` validates writes before saving.

Hand-editing `config.json` is explicitly supported. `slashcash config set` validates, but a user is free to edit the file directly; the next load that fails validation prompts for `doctor --fix`.

## Failure-mode matrix

Every documented failure has a check and, where possible, a repair.

- Ollama daemon not reachable. Check by HTTP request to the tags endpoint. Repair by suggesting the Homebrew service start command (no auto-start in v1).
- Chat or vision model not pulled. Check by inspecting Ollama tags. Repair by running `ollama pull`.
- `gcloud` not on `PATH`. Check by which-style lookup. Repair by running the Homebrew cask install command recorded in ADR-011 (`brew install --cask google-cloud-sdk`).
- `gcloud` not authenticated. Check by parsing `gcloud auth list --format=json` for an active account. Repair by launching `gcloud auth login` interactively.
- `gws` not on `PATH`. Check by which-style lookup. Repair by running the Homebrew install command recorded in ADR-011.
- `~/.config/gws/client_secret.json` missing or Gmail API not enabled for the active project. Check by file existence plus `gcloud services list --enabled --filter gmail.googleapis.com`. Repair by running `gws auth setup` with the terminal attached so upstream can ask any project/API/OAuth prompts it still owns (see ADR-022).
- `gws auth status` not authenticated. Check by parsing the status command's JSON. Repair by launching `gws auth login --scopes gmail.readonly` interactively.
- Google API not enabled for the user's Cloud project (`accessNotConfigured`). Surfaced during ingest, not onboard. Repair is the same as the `~/.config/gws/client_secret.json` entry above.
- Port in use. Surfaced by the bind failure in `start`. Not auto-fixed; user is pointed at `--port` or `config set port`.
- State directory missing or wrong permissions. Check with `stat`. Repair by creating and chmod'ing.
- Stale PID file. Check by reading the file and probing the PID. Repair by deleting the file.
- Config schema drift. Check by schema parse. Repair by applying defaults and writing back.
- Migration drift. Check by Drizzle's migration journal. Repair by running pending migrations.
- Required binaries for enabled skills missing. Check by per-skill `requires.bins`. Repair depends on the skill; for the bundled Gmail skill, the required binary is `gws`, whose repair is above.

## Environment variables

The small number of environment variables the CLI recognises are listed in `reference/env-vars.md`. In general, config values win over environment variables; environment variables are for developer overrides and the bootstrap phase before `config.json` exists.
