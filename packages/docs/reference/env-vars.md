# Reference — Environment variables

Most users never need to set any of these. `config.json` is the normal control surface; environment variables exist for bootstrap, tests, and local overrides.

## Core local runtime

`SLASHCASH_HOME`

- Overrides the state directory.
- Default: `$HOME/.slashcash`.

`SQLITE_DB_PATH`

- Overrides the SQLite file path.
- Default: `${SLASHCASH_HOME}/db.sqlite`.

`SLASHCASH_ATTACHMENTS_DIR`

- Overrides the attachment directory.
- Default: `${SLASHCASH_HOME}/attachments`.

`SLASHCASH_PORT`

- Loopback port override for `slashcash start`.
- Default: `3000`.

`SLASHCASH_NO_OPEN`

- Set to `1` to suppress browser launch in `slashcash start`.

`SLASHCASH_USE_STANDALONE`

- Developer override that forces `slashcash start` to prefer a locally built standalone Next.js server when present.

## Ollama

`OLLAMA_BASE_URL`

- Overrides the Ollama OpenAI-compatible base URL.
- Default: `http://127.0.0.1:11434/v1`.

`OLLAMA_CHAT_MODEL`

- Runtime override for the chat model id.
- Default: `gemma3n:e4b`.

`OLLAMA_VISION_MODEL`

- Runtime override for the vision model id.
- Default: `gemma3n:e4b`.
- Legacy after the PDF-extractor pivot; PDF extraction is handled by the Python lane (see `SLASHCASH_PDF_EXTRACTOR_*`).

## PDF extractor runtime

`SLASHCASH_PDF_EXTRACTOR_DISABLED`

- Set to `1` to skip the Python lane entirely. Ingest degrades to body-only extraction.
- Used by E2E fixtures and Python-less CI nodes.

`SLASHCASH_PDF_EXTRACTOR_PYTHON`

- Override the Python interpreter path used to spawn the extractor.
- Default: `${SLASHCASH_HOME}/py-venv/bin/python`.

`SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS`

- Override the per-PDF subprocess timeout.
- Default: `30000`.

`SLASHCASH_DOCTOR_SKIP_PYTHON`

- Set to `1` to treat the `python-env` check as skipped in `doctor`. Mirrors `SLASHCASH_DOCTOR_SKIP_OLLAMA`.

## Gmail / IMAP runtime

The CLI usually sets these before starting the app, cron worker, or sync command. Users normally do not export them manually.

`SLASHCASH_GMAIL_QUERY`

- Runtime override for the Gmail search query.

`SLASHCASH_SYNC_LIMIT`

- Runtime override for the number of messages to inspect.

`SLASHCASH_IMAP_SERVER`

- Runtime IMAP endpoint.
- Default: `imap.gmail.com:993`.

`SLASHCASH_GMAIL_ADDRESS`

- Runtime Gmail address loaded from `config.json` + the credential store.

`SLASHCASH_GMAIL_APP_PASSWORD`

- Runtime Gmail app password loaded from Keychain or the fallback credentials file.

`SLASHCASH_GMAIL_PASSWORD_STORE`

- Runtime hint set by the CLI to `keychain` or `file`.

`SLASHCASH_SYNC_SKIP_AI`

- Developer/test override that skips local model extraction and forces deterministic fallback extraction.

`SLASHCASH_IMAP_FIXTURE_DIR`

- Points the IMAP client at committed `.eml` fixtures instead of a real Gmail account.

## Test and release gates

`SLASHCASH_E2E`

- Enables hidden E2E-only CLI flags and lets `onboard --dry-run` skip host-touching work.

`SLASHCASH_DOCTOR_SKIP_OLLAMA`

- Set to `1` to make doctor treat Ollama checks as skipped.

`SLASHCASH_EVAL_SKIP_MODEL`

- Set to `1` for the deterministic eval gate path.

`SLASHCASH_EVAL_THRESHOLD`

- Numeric eval threshold.
- Default: `0.8`.

`SLASHCASH_BUNDLE_BUDGET_BYTES`

- Bundle-size ceiling for `pnpm bundle:check`.

`SLASHCASH_PACK_SMOKE_NPM`

- Override the npm executable used by `bundle:pack-smoke`.

`SLASHCASH_KEEP_PACK_SMOKE`

- Set to `1` to keep the temporary packed-install directory.

`SLASHCASH_BENCH_VERSION_MS`

- Budget for `slashcash --version`.

`SLASHCASH_BENCH_DOCTOR_QUICK_MS`

- Budget for `slashcash doctor --quick`.

`PLAYWRIGHT_BASE_URL`

- Playwright-only base URL override.

`CI`

- Standard CI flag consumed by test tooling.

## Removed hosted variables

The shipping code should not read these:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Trigger.dev: `TRIGGER_SECRET_KEY`
- Hosted Google OAuth owned by us: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Remote AI providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`
- Vercel surface: `VERCEL_URL`, `NEXT_PUBLIC_VERCEL_URL`, `NEXT_PUBLIC_SITE_URL`
- Postgres: `DATABASE_URL`

## Where variables are read

The paths module reads `SLASHCASH_HOME` and `SQLITE_DB_PATH`. Attachment helpers read `SLASHCASH_ATTACHMENTS_DIR`. The start/sync/job bootstraps set and read the IMAP and Ollama runtime variables. The Python extractor wrapper at `packages/tasks/src/extract/pdf-extractor.ts` reads `SLASHCASH_PDF_EXTRACTOR_*`. The E2E and fixture harnesses use `SLASHCASH_IMAP_FIXTURE_DIR`, `SLASHCASH_SYNC_SKIP_AI`, `SLASHCASH_PDF_EXTRACTOR_DISABLED`, `SLASHCASH_DOCTOR_SKIP_OLLAMA`, and `SLASHCASH_DOCTOR_SKIP_PYTHON`.
