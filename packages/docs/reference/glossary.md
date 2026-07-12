# Reference — Glossary

Short definitions for terms that appear across the plan and docs. Product language matches root `CONTEXT.md`.

**Desktop app**
The primary product the person downloads and runs — an Electron shell around the local dashboard and bundled runtime.
_Avoid:_ CLI product, npm package (as the product), desktop shell (as a secondary optional path).

**Bundled runtime**
The `slashcash` package shipped inside the desktop app to supervise the local server and machine-side setup steps.
_Avoid:_ end-user CLI, global npm install, `npm i -g slashcash`.

**State directory**
`~/.slashcash/`. Holds `config.json`, `credentials.json` fallback storage, `db.sqlite`, `attachments/`, `logs/`, `pid/`, `skills/`, and `py-venv/`. The single on-disk home for both the desktop app and any internal runtime commands.
_Avoid:_ Electron `userData` as the product data home, Application Support `slash.cash` as a separate product store.

**Desktop onboarding**
First-launch setup inside the desktop app UI that covers the former CLI onboard scope (privacy, machine prep, Gmail IMAP credentials, optional assistant).
_Avoid:_ `slashcash onboard`, terminal wizard, marketing-site onboarding.

**slashcash**
The bundled runtime package (`packages/cli`). Used inside the desktop app and by maintainers via `pnpm slashcash -- …`. Not the end-user install product.

**local-first**
All user data, compute, and credentials live on the user's machine. The product stays useful without hosted services after onboarding.

**single-user**
One human on one machine. No logins, teams, or sync.

**loopback**
`127.0.0.1`. The only address the dashboard binds to.

**doctor**
The diagnostic and repair flow behind `slashcash doctor` and `slashcash doctor --fix` (and any in-app equivalent surfaced from Desktop onboarding).

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
The local model server slashcash can use for assistant chat after the user opts in.

**gemma4:latest**
The default local assistant model tag when the user chooses Ollama. It is not part of ingest.

**Docling**
The optional Python library ([github.com/DS4SD/docling](https://github.com/DS4SD/docling), IBM, MIT-licensed) slashcash tries before pdfplumber for deterministic PDF invoice extraction. See ADR-026.

**PDF extractor**
The Node-side wrapper at `packages/tasks/src/extract/pdf-extractor.ts` plus the Python package at `packages/pdf-extractor/`. Node spawns `python -m slashcash_pdf_extractor` per PDF and parses the JSON stdout against a Zod mirror of the Python schema.

**py-venv**
The Python 3 virtualenv at `~/.slashcash/py-venv/`. Provisioned by doctor repair / Desktop onboarding from the pinned `packages/pdf-extractor/requirements.txt`. Tracked by the `.slashcash.install-hash` file so `pip install` only re-runs on drift.

**single-flight**
The guarantee that the ingest job never overlaps with itself. Enforced by a module-level mutex.

**job registry**
The runtime object that maps skill-declared job ids to async functions for cron.

**PID file**
`~/.slashcash/pid/slashcash.pid.json`. Lets stop/status find the running bundled-runtime process.

**standalone output**
Next.js packaging mode used for the dashboard tree staged into the bundled runtime / desktop `extraResources`.

**ADR**
Architecture decision record. Stored in `packages/docs/reference/decisions.md`.

**openclaw**
The reference CLI we borrow structure from, especially the wizard and command-loading patterns.
