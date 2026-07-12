# Architecture — target state

This is the shipped local-first shape after the IMAP pivot and the desktop-primary distribution decision (ADR-028), with the Swiggy ingest pivot ([`roadmap/pdf-extractor.md`](./roadmap/pdf-extractor.md)) making Python extraction deterministic and keeping AI out of the blocking ingest path.

## One-paragraph picture

The user downloads the **Desktop app** (macOS). First launch runs **Desktop onboarding**, which prepares the **State directory** (`~/.slashcash/`), collects a Gmail address and app password, verifies IMAP login against `imap.gmail.com:993`, and gets the dashboard ready without requiring a model pull. The Electron shell supervises the **Bundled runtime** (`slashcash`), which boots the Next.js dashboard on `127.0.0.1`, starts the in-process cron worker, reads Gmail through IMAP, converts PDF attachments through a per-PDF Python subprocess, deterministically maps Swiggy invoice/body fields, writes results to SQLite at `~/.slashcash/db.sqlite`, and stores attachments under `~/.slashcash/attachments/`. Assistant model setup is separate: users can configure Ollama/Gemma or a supported API provider when they want chat. The dashboard reads the same SQLite file through tRPC and Drizzle. There is no hosted auth; loopback bind is the boundary. Public npm install is not the product path.

## Process model

The **Desktop app** owns the outer process (Electron). Inside it, one Node process (the bundled runtime) runs two cooperating subsystems:

- the Next.js server on `127.0.0.1`
- the cron worker, protected by a single-flight mutex

Gmail access is not a subprocess anymore; it is an in-process IMAP client using `imapflow`. The PDF extractor is spawned on demand as a per-PDF `python3 -m slashcash_pdf_extractor` child process against the venv; there is no long-lived Python daemon. Ollama is only needed when the assistant uses a local model, not for Swiggy ingest.

## Desktop app and bundled runtime

`apps/desktop` is the primary product shell. It packages the dashboard and stages `packages/cli` as **extraResources** (the **Bundled runtime**). The shell sets `SLASHCASH_HOME` to `~/.slashcash/` and spawns the runtime to supervise the local server.

`packages/cli` still exposes a `slashcash` bin for maintainer and monorepo workflows (`pnpm slashcash -- …`). End users are not directed to `npm i -g slashcash`. Runtime-facing commands that remain useful internally include start/stop/status, doctor, config, sync, skills, logs, db, privacy, and version. Subcommands are lazy-loaded. Runtime boundaries such as argv, config, and IMAP credential state are validated before they reach the rest of the system.

## Dashboard

`apps/main` remains the dashboard. It is local-only:

- tRPC uses the static local user id from `@workspace/database`
- the assistant routes through the configured chat provider when enabled
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

## Extraction pipeline

`packages/tasks/src/extract/pipeline.ts` owns the per-message extraction contract:

- **PDF conversion.** For each `application/pdf` attachment, `extract-from-pdf.ts` spawns `~/.slashcash/py-venv/bin/python -m slashcash_pdf_extractor <attachment-path>`. The Python package uses local parsers such as Docling and pdfplumber to extract raw sources and deterministic Swiggy fields.
- **Deterministic mapping.** Known Swiggy invoice/body patterns are mapped into the merchant schema without a model call. Exact invoice values come from the PDF/body sources, not from generated text.
- **Fallbacks.** `body-fallback.ts` remains for body-only transaction emails where PDF extraction is unavailable. Non-transactional Swiggy messages are skipped cleanly instead of counted as sync failures.

The Python lane is disabled end-to-end by `SLASHCASH_PDF_EXTRACTOR_DISABLED=1`, which Python-less CI nodes can use for body-only fallback coverage.

## Credentials and local state

User state lives under `~/.slashcash/`:

- `config.json`
- `credentials.json` fallback storage when Keychain is unavailable
- `db.sqlite`
- `attachments/`
- `logs/`
- `pid/`
- `skills/`
- `py-venv/` — Python 3 virtualenv holding Docling and the `slashcash_pdf_extractor` package; provisioned by doctor repair / Desktop onboarding

The Gmail app password is stored in the macOS Keychain when possible. If Keychain is unavailable, slashcash falls back to `~/.slashcash/credentials.json` and doctor reminds the user that the password is stored plaintext.

The Python venv is provisioned once from a pinned `packages/pdf-extractor/requirements.txt` and re-provisioned on hash drift. Doctor surfaces the `python-env` check as a first-class repair target; its failure modes are listed in `python/errors.ts`.

## Skills and cron

Skills live under `~/.slashcash/skills/`. The bundled `gmail-swiggy` skill contributes the IMAP sync job. The cron worker registers jobs from installed skill manifests and re-checks the enabled flag before each run.

## Failure modes and doctor

Doctor covers:

- Node version
- state directory
- config schema
- Gmail credential presence
- SQLite database
- bundled skills
- assistant provider readiness, including Ollama reachability/model pull status when local chat is configured
- Gmail IMAP login verification
- Python environment for the PDF extractor (interpreter version, venv presence, pinned `pip install` state, extractor importability)

IMAP failures are classified into a closed union such as bad password, 2FA not enabled, advanced protection, workspace policy, rate limiting, quota, mailbox selection problems, and unknown failures. Python-env failures are classified separately: missing interpreter, interpreter too old, venv creation failure, `pip install` failure, extractor import failure. Repairs point the user at a concrete next step.

## Security posture

- The dashboard binds to `127.0.0.1`.
- There is no hosted backend.
- There is no telemetry.
- Normal ingest outbound calls are limited to Gmail IMAP. Assistant chat may also call the configured local or user-supplied provider.
- The Python extractor is pure `(pdf path) -> JSON on stdout`; it makes no network calls, holds no state between invocations, and reads only the PDF file it was handed.
- Attachment routes never accept raw filesystem paths from the client.

## Not in v1

- hosted auth
- multi-user or sync
- cloud queue / worker fleet
- Windows or Linux support
- co-equal public npm / `npm i -g slashcash` product install (see ADR-028)
