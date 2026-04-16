# Reference — Config and state directory

All user state lives under `~/.slashcash/`. This document describes the layout, the config keys, and the migration policy. Everything is validated by a schema at load time; the schema itself lives in `packages/cli/src/config/schema.ts`.

## Directory layout

- `config.json` — the user-editable configuration. Validated on every load.
- `db.sqlite` — the Drizzle-managed SQLite database.
- `attachments/` — PDF attachments extracted by the Gmail ingest path. One file per email id.
- `logs/` — structured JSON logs. Rotated daily, seven-day retention by default.
- `pid/slashcash.pid` — PID file for the running `slashcash start` process.
- `skills/` — installed skills, one folder per skill id.

The directory is created with permissions that make it readable and writable only by the user. `slashcash doctor --fix` enforces this; if the directory or any child has wider permissions, the fix narrows them.

## Config keys

Keys are grouped. Each key has a documented default; unspecified keys fall back to defaults. Writing a key that does not exist in the schema returns a non-zero exit from `slashcash config set`.

**`port`** — the loopback port the Next.js server binds to. Default `7421`. Must be between 1024 and 65535.

**`ai.baseUrl`** — the base URL of the Ollama OpenAI-compatible endpoint. Default `http://127.0.0.1:11434/v1`. Overrideable by the environment variable `OLLAMA_BASE_URL` for debugging; the config value wins once set.

**`ai.chatModel`** — the model id used by the chat assistant. Default `gemma3n:e4b`. The model must be present in the Ollama daemon; `slashcash doctor` checks this.

**`ai.visionModel`** — the model id used for PDF parsing. Default `gemma3n:e4b`. If Phase 2 W6 concludes that a dedicated VLM is needed, the recommended default becomes whichever model ADR-012 records.

**`cron.enabled`** — boolean. Default `true`. When `false`, the cron schedule is not registered at `start` and only manual `slashcash sync` runs the ingest job.

**`cron.schedule`** — a cron expression. Default `*/15 * * * *`. Validated against the set of expressions `node-cron` accepts.

**`skills.<id>.enabled`** — boolean, one per installed skill. Default `true` for skills installed by `onboard`; default `false` for skills dropped in manually.

**`logs.retentionDays`** — integer. Default `7`.

## Migration policy

Config migration is owned by `slashcash doctor --fix`. Start-time load is strict: if the file on disk does not parse against the current schema, the CLI prints the failing keys and points the user at `slashcash doctor --fix`, then exits non-zero. It does not silently rewrite the file.

When the schema gains a field, `doctor --fix` adds the default value and writes the file back. When the schema renames a field, the repair path moves the value from the old key to the new key and deletes the old key. When the schema removes a field, the repair deletes the key. The rule is the same rule openclaw uses: never migrate on cold load; always migrate in `doctor`.

Hand-editing `config.json` is explicitly supported. `slashcash config set` validates, but a user is free to edit the file directly; the next load that fails validation prompts for `doctor --fix`.

## Failure-mode matrix

Every documented failure has a check and, where possible, a repair.

- Ollama daemon not reachable. Check by HTTP request to the tags endpoint. Repair by suggesting the Homebrew service start command (no auto-start in v1).
- Chat or vision model not pulled. Check by inspecting Ollama tags. Repair by running `ollama pull`.
- `gws` not on `PATH`. Check by which-style lookup. Repair by running the Homebrew install command recorded in ADR-011.
- `gws auth status` not authenticated. Check by parsing the status command's JSON. Repair by launching `gws auth login` interactively.
- Port in use. Surfaced by the bind failure in `start`. Not auto-fixed; user is pointed at `--port` or `config set port`.
- State directory missing or wrong permissions. Check with `stat`. Repair by creating and chmod'ing.
- Stale PID file. Check by reading the file and probing the PID. Repair by deleting the file.
- Config schema drift. Check by schema parse. Repair by applying defaults and writing back.
- Migration drift. Check by Drizzle's migration journal. Repair by running pending migrations.
- Required binaries for enabled skills missing. Check by per-skill `requires.bins`. Repair depends on the skill; for the bundled Gmail skill, the required binary is `gws`, whose repair is above.

## Environment variables

The small number of environment variables the CLI recognises are listed in `reference/env-vars.md`. In general, config values win over environment variables; environment variables are for developer overrides and the bootstrap phase before `config.json` exists.
