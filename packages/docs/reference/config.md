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
- `py-venv/` — Python 3 virtualenv holding Docling and the `slashcash_pdf_extractor` package
- `py-venv/.slashcash.install-hash` — sha256 of the `requirements.txt` the venv was installed from; doctor compares this to the shipped file to decide whether to re-run `pip install`

`slashcash doctor --fix` recreates missing state directories and bundled skills, and provisions or re-provisions the Python venv when the hash file is missing or stale.

## Config keys

### `server`

- `server.host` — loopback host. Default `127.0.0.1`.
- `server.port` — dashboard port. Default `3000`.

### `ai`

- `ai.ollamaBaseUrl` — default `http://127.0.0.1:11434/v1`
- `ai.chatModel` — default `gemma4:latest`
- `ai.visionModel` — legacy key retained for config migration.

### `assistant`

- `assistant.provider` — `none`, `ollama-local`, `openai-compatible`, or `anthropic`. Default `none`.
- `assistant.baseUrl` — provider base URL. Defaults to local Ollama's OpenAI-compatible endpoint.
- `assistant.chatModel` — chat model. Default `gemma4:latest`; OpenAI-compatible setup defaults to `gpt-4o-mini`.

### `pdfExtractor`

- `pdfExtractor.enabled` — default `true`. When `false`, ingest skips the Docling lane and degrades to body-only extraction, same as setting `SLASHCASH_PDF_EXTRACTOR_DISABLED=1`.
- `pdfExtractor.timeoutMs` — per-PDF subprocess timeout. Default `30000`.
- `pdfExtractor.pythonBin` — override the interpreter path. Default is `${SLASHCASH_HOME}/py-venv/bin/python`.

### `sync`

- `sync.schedule` — cron string. Default `*/15 * * * *`
- `sync.gmailQuery` — default `from:(swiggy.in OR swiggy.com OR uber.com OR ubereats.com OR doordash.com) newer_than:365d`
- `sync.maxMessages` — default `50`
- `sync.concurrency.fetch` — default `4`
- `sync.concurrency.extract` — default `4`
- `sync.concurrency.write` — fixed at `1`

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

- assistant provider unconfigured or unreachable
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
- Python 3 interpreter missing or older than 3.11
- `~/.slashcash/py-venv/` missing or not a valid venv
- `pip install --require-hashes` state stale (`.slashcash.install-hash` mismatch)
- `python -m slashcash_pdf_extractor` import failure (Docling wheel missing, broken ABI, etc.)

`slashcash doctor --reset-credentials` deletes the saved Gmail credential and lets the user rerun onboarding cleanly.

## Environment variables

See `reference/env-vars.md` for the supported override set and test-only variables.
