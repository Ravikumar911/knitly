# Reference — Glossary

Short definitions for terms that appear across the plan and docs.

**slashcash**
The npm package and CLI. Global bin: `slashcash`.

**local-first**
All user data, compute, and credentials live on the user's machine. The product stays useful without hosted services after onboarding.

**single-user**
One human on one machine. No logins, teams, or sync.

**loopback**
`127.0.0.1`. The only address the dashboard binds to.

**onboard**
The interactive `slashcash onboard` wizard. It checks Homebrew and Ollama, prompts for a Gmail address and app password, verifies IMAP login, and prepares local state.

**doctor**
The diagnostic and repair flow behind `slashcash doctor` and `slashcash doctor --fix`.

**state directory**
`~/.slashcash/`. Holds `config.json`, `credentials.json` fallback storage, `db.sqlite`, `attachments/`, `logs/`, `pid/`, and `skills/`.

**config**
The contents of `~/.slashcash/config.json`, validated against `packages/cli/src/config/schema.ts`.

**credential store**
The place where the Gmail app password lives after onboarding. Primary path: macOS Keychain. Fallback: `~/.slashcash/credentials.json`.

**app password**
A 16-character Gmail credential generated at <https://myaccount.google.com/apppasswords>. slashcash uses it for IMAP login.

**IMAP**
The mailbox protocol slashcash uses for Gmail ingest. Endpoint: `imap.gmail.com:993`.

**IMAP fixture**
A committed `.eml` file under `packages/e2e-tests/fixtures/imap/` used to test the ingest path without a real Gmail account.

**skill**
A folder under `~/.slashcash/skills/` that can add jobs and guidance. The bundled v1 skill is `gmail-swiggy`.

**Ollama**
The local model server slashcash uses for chat and source-text extraction.

**gemma3n:e4b**
The default Ollama model. Handles chat and the structured Swiggy extraction pass over email body plus Docling PDF text. PDF conversion itself is handled by Docling, not Gemma.

**Docling**
The Python library ([github.com/DS4SD/docling](https://github.com/DS4SD/docling), IBM, MIT-licensed) slashcash uses for deterministic PDF invoice extraction. See ADR-026.

**PDF extractor**
The Node-side wrapper at `packages/tasks/src/extract/pdf-extractor.ts` plus the Python package at `packages/pdf-extractor/`. Node spawns `python -m slashcash_pdf_extractor` per PDF and parses the JSON stdout against a Zod mirror of the Python schema.

**py-venv**
The Python 3 virtualenv at `~/.slashcash/py-venv/`. Provisioned by `slashcash doctor --fix` from the pinned `packages/pdf-extractor/requirements.txt`. Tracked by the `.slashcash.install-hash` file so `pip install` only re-runs on drift.

**source extraction pass**
The single Gemma `generateObject` call in the ingest pipeline that receives the email body plus Docling PDF text and returns the authoritative `transactions_v2` object.

**single-flight**
The guarantee that the ingest job never overlaps with itself. Enforced by a module-level mutex.

**job registry**
The runtime object that maps skill-declared job ids to async functions for cron.

**PID file**
`~/.slashcash/pid/slashcash.pid.json`. Lets `slashcash stop` and `slashcash status` find the running process.

**standalone output**
Next.js packaging mode used for the published CLI bundle.

**ADR**
Architecture decision record. Stored in `packages/docs/reference/decisions.md`.

**openclaw**
The reference CLI we borrow structure from, especially the wizard and command-loading patterns.
