# Reference — Config and state directory

All user state lives under `~/.slashcash/`. The config schema lives in `packages/cli/src/config/schema.ts`.

## Directory layout

- `config.json` — user-editable config
- `credentials.json` — plaintext Gmail app-password fallback when Keychain is unavailable
- `db.sqlite` — SQLite database
- `attachments/` — stored PDF attachments
- `cache/` — small local cache files
- `logs/` — structured JSON logs
- `pid/slashcash.pid.json` — PID file for `slashcash start`
- `skills/` — installed skills

`slashcash doctor --fix` recreates missing state directories and bundled skills.

## Config keys

### `server`

- `server.host` — loopback host. Default `127.0.0.1`.
- `server.port` — dashboard port. Default `3000`.

### `ai`

- `ai.ollamaBaseUrl` — default `http://127.0.0.1:11434/v1`
- `ai.chatModel` — default `gemma3n:e4b`
- `ai.visionModel` — default `gemma3n:e4b`

### `sync`

- `sync.schedule` — cron string. Default `*/15 * * * *`
- `sync.gmailQuery` — default `from:(swiggy.in) newer_than:365d`
- `sync.maxMessages` — default `50`

### `gmail`

- `gmail.address` — the Gmail address to sync
- `gmail.passwordStore` — `keychain` or `file`
- `gmail.imapServer` — pinned to `imap.gmail.com:993` in v1

The password itself is never stored in `config.json`.

### `skills`

- `skills.enabled.<id>` — enable/disable flag per installed skill

### `updates`

- `updates.checkOnVersion` — opt-in once-per-day npm latest check

## Migration policy

Config migration currently happens on load: defaults are applied, and the normalized config is written back. Renames or removals should be handled explicitly in `doctor --fix` when they are introduced.

## Failure-mode matrix

`slashcash doctor` or normal command execution covers these cases:

- Ollama daemon unreachable
- chosen model not pulled
- Gmail credentials missing
- Gmail app password rejected
- Gmail account missing 2-Step Verification for app passwords
- Google Advanced Protection or Workspace policy blocking app passwords
- IMAP endpoint unreachable or TLS failing
- state directory missing or wrong permissions
- stale PID file
- config schema drift
- migration drift
- required binaries for enabled skills missing

`slashcash doctor --reset-credentials` deletes the saved Gmail credential and lets the user rerun onboarding cleanly.

## Environment variables

See `reference/env-vars.md` for the supported override set and test-only variables.
