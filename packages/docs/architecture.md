# Architecture — target state

This is the shipped local-first shape after the IMAP pivot.

## One-paragraph picture

The user installs `slashcash` from npm. `slashcash onboard` checks Homebrew, detects or installs Ollama, pulls the chosen model, asks for a Gmail address and app password, verifies IMAP login against `imap.gmail.com:993`, and prepares `~/.slashcash/`. `slashcash start` then boots the Next.js dashboard on `127.0.0.1`, starts the in-process cron worker, reads Gmail through IMAP, parses messages and attachments locally, writes results to SQLite at `~/.slashcash/db.sqlite`, and stores attachments under `~/.slashcash/attachments/`. The dashboard reads the same SQLite file through tRPC and Drizzle. There is no hosted auth; loopback bind is the boundary.

## Process model

One Node process runs two cooperating subsystems:

- the Next.js server on `127.0.0.1`
- the cron worker, protected by a single-flight mutex

The only steady-state external process is the Ollama daemon on loopback. Gmail access is not a subprocess anymore; it is an in-process IMAP client using `imapflow`.

## CLI

`packages/cli` ships the `slashcash` bin. Its top-level commands are:

- `onboard`
- `start`
- `stop`
- `status`
- `doctor`
- `config`
- `sync`
- `skills`
- `logs`
- `db`
- `privacy`
- `version`

Subcommands are lazy-loaded. Runtime boundaries such as argv, config, and IMAP credential state are validated before they reach the rest of the system.

## Dashboard

`apps/main` remains the dashboard. It is local-only:

- tRPC uses the static local user id from `@workspace/database`
- the assistant routes through the local Ollama-compatible provider
- attachment downloads go through the local Next.js route
- the app binds to loopback only

## Database

`packages/database` is the single source of truth for SQLite schema, migrations, and query helpers. The DB file lives at `~/.slashcash/db.sqlite`. Start and doctor paths ensure the file exists and that migrations have been applied before normal app use.

## Gmail ingest

`packages/tasks/src/gmail/imap-client.ts` owns Gmail access. It:

- logs into `imap.gmail.com:993` over TLS
- searches with Gmail's `X-GM-RAW` extension
- fetches RFC822 message bodies
- parses MIME with `mailparser`
- exposes typed `{ headers, text, html, attachments }` payloads to the ingest pipeline

Fixture mode is controlled by `SLASHCASH_IMAP_FIXTURE_DIR`, which points the client at committed `.eml` files instead of a real mailbox.

## Credentials and local state

User state lives under `~/.slashcash/`:

- `config.json`
- `credentials.json` fallback storage when Keychain is unavailable
- `db.sqlite`
- `attachments/`
- `logs/`
- `pid/`
- `skills/`

The Gmail app password is stored in the macOS Keychain when possible. If Keychain is unavailable, slashcash falls back to `~/.slashcash/credentials.json` and `doctor` reminds the user that the password is stored plaintext.

## Skills and cron

Skills live under `~/.slashcash/skills/`. The bundled `gmail-swiggy` skill contributes the IMAP sync job. The cron worker registers jobs from installed skill manifests and re-checks the enabled flag before each run.

## Failure modes and doctor

`slashcash doctor` covers:

- Node version
- state directory
- config schema
- Gmail credential presence
- SQLite database
- bundled skills
- Ollama reachability and model pull status
- Gmail IMAP login verification

IMAP failures are classified into a closed union such as bad password, 2FA not enabled, advanced protection, workspace policy, rate limiting, quota, mailbox selection problems, and unknown failures. Repairs point the user at a concrete next step.

## Security posture

- The dashboard binds to `127.0.0.1`.
- There is no hosted backend.
- There is no telemetry.
- Normal outbound calls are limited to Gmail IMAP and the local Ollama daemon.
- Attachment routes never accept raw filesystem paths from the client.

## Not in v1

- hosted auth
- multi-user or sync
- cloud queue / worker fleet
- desktop shell
- Windows or Linux support
