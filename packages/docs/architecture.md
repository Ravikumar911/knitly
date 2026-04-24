# Architecture — target state

This is the shipped local-first shape after the IMAP pivot, with the PDF-extractor pivot ([`roadmap/pdf-extractor.md`](./roadmap/pdf-extractor.md)) adding the Python lane layered on top.

## One-paragraph picture

The user installs `slashcash` from npm. `slashcash onboard` checks Homebrew, detects or installs Ollama, pulls the chosen model, provisions a Python 3.11+ venv at `~/.slashcash/py-venv` with Docling pinned, asks for a Gmail address and app password, verifies IMAP login against `imap.gmail.com:993`, and prepares `~/.slashcash/`. `slashcash start` then boots the Next.js dashboard on `127.0.0.1`, starts the in-process cron worker, reads Gmail through IMAP, extracts data from each message in two lanes — email body and inline images through Gemma over Ollama, PDF attachments through a per-PDF Docling subprocess — reconciles the two candidates with one more Gemma pass, writes results to SQLite at `~/.slashcash/db.sqlite`, and stores attachments under `~/.slashcash/attachments/`. The dashboard reads the same SQLite file through tRPC and Drizzle. There is no hosted auth; loopback bind is the boundary.

## Process model

One Node process runs two cooperating subsystems:

- the Next.js server on `127.0.0.1`
- the cron worker, protected by a single-flight mutex

The only steady-state external process is the Ollama daemon on loopback. Gmail access is not a subprocess anymore; it is an in-process IMAP client using `imapflow`. The PDF extractor is spawned on demand as a per-PDF `python3 -m slashcash_pdf_extractor` child process against the venv; there is no long-lived Python daemon.

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

## Extraction pipeline

`packages/tasks/src/extract/pipeline.ts` owns the per-message extraction contract. For each `FetchedImapMessage` it fans out into two lanes and then reconciles:

- **Email-body lane.** `extract-from-email-body.ts` calls Gemma (`generateObject`) with the merchant Zod schema over the message text, HTML, and any inline images. Returns a structured candidate with a confidence score, or `null` for empty / non-matching bodies.
- **PDF lane.** For each `application/pdf` attachment, `extract-from-pdf.ts` spawns `~/.slashcash/py-venv/bin/python -m slashcash_pdf_extractor <attachment-path>`. The Node wrapper in `pdf-extractor.ts` returns a `Result<PdfExtraction, PdfExtractError>` with a 30-second timeout and a closed error union; it never throws.
- **Reconciliation pass.** When both lanes produce a candidate, `reconcile-extractions.ts` calls Gemma once more, passing both JSON candidates and a merchant-specific reconciliation rules block (for Swiggy: prefer the PDF amount and orderId, prefer the email `from`/`date`, penalise confidence on disagreement).
- **Fallbacks.** If the PDF lane fails, ingest degrades to the body-only candidate. If the reconciliation pass refuses twice, the PDF candidate wins when present; otherwise the body candidate; otherwise `body-fallback.ts` runs the regex fallback for amount and orderId. `dataSource` on `transactions_v2` reflects which lane produced the authoritative fields.

The Python lane is disabled end-to-end by `SLASHCASH_PDF_EXTRACTOR_DISABLED=1`, which is what E2E fixtures and Python-less CI nodes use.

## Credentials and local state

User state lives under `~/.slashcash/`:

- `config.json`
- `credentials.json` fallback storage when Keychain is unavailable
- `db.sqlite`
- `attachments/`
- `logs/`
- `pid/`
- `skills/`
- `py-venv/` — Python 3 virtualenv holding Docling and the `slashcash_pdf_extractor` package; provisioned by `slashcash doctor --fix`

The Gmail app password is stored in the macOS Keychain when possible. If Keychain is unavailable, slashcash falls back to `~/.slashcash/credentials.json` and `doctor` reminds the user that the password is stored plaintext.

The Python venv is provisioned once from a pinned `packages/pdf-extractor/requirements.txt` and re-provisioned on hash drift. `doctor` surfaces the `python-env` check as a first-class repair target; its failure modes are listed in `python/errors.ts`.

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
- Python environment for the PDF extractor (interpreter version, venv presence, pinned `pip install` state, extractor importability)

IMAP failures are classified into a closed union such as bad password, 2FA not enabled, advanced protection, workspace policy, rate limiting, quota, mailbox selection problems, and unknown failures. Python-env failures are classified separately: missing interpreter, interpreter too old, venv creation failure, `pip install` failure, extractor import failure. Repairs point the user at a concrete next step.

## Security posture

- The dashboard binds to `127.0.0.1`.
- There is no hosted backend.
- There is no telemetry.
- Normal outbound calls are limited to Gmail IMAP and the local Ollama daemon.
- The Python extractor is pure `(pdf path) -> JSON on stdout`; it makes no network calls, holds no state between invocations, and reads only the PDF file it was handed.
- Attachment routes never accept raw filesystem paths from the client.

## Not in v1

- hosted auth
- multi-user or sync
- cloud queue / worker fleet
- desktop shell
- Windows or Linux support
