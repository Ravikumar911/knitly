# Reference — Environment variables

The local app has a small, tightly scoped set of environment variables. Most users never set any of them; the defaults are correct for a clean macOS machine after `slashcash onboard`. Config values in `~/.slashcash/config.json` override environment variables in normal operation; environment variables are for developer overrides and bootstrap.

## What we ship with

`SLASHCASH_HOME` — optional override for the state directory. Defaults to `$HOME/.slashcash`. Used by `slashcash config path`, the paths module, and every downstream reader of `config.json`, `db.sqlite`, `attachments/`, `logs/` and `pid/`.

`SQLITE_DB_PATH` — optional override for the database file path. Defaults to `${SLASHCASH_HOME}/db.sqlite`. Useful for tests and for moving the database to an external volume.

`SLASHCASH_ATTACHMENTS_DIR` — optional override for the attachment directory. Defaults to `${SLASHCASH_HOME}/attachments`. Used by the Gmail ingest path and the attachment-serving route.

`OLLAMA_BASE_URL` — optional override for the Ollama OpenAI-compatible endpoint. Defaults to `http://127.0.0.1:11434/v1`. Config key `ai.ollamaBaseUrl` overrides this once set.

`OLLAMA_CHAT_MODEL` — optional override for the chat model id. Defaults to `gemma3n:e4b`. Config key `ai.chatModel` overrides this once set.

`OLLAMA_VISION_MODEL` — optional override for the vision model id. Defaults to `gemma3n:e4b`. Config key `ai.visionModel` overrides this once set.

`GWS_PROFILE` — passed through to `gws` subprocesses unchanged. Lets users with multiple Google accounts select one. No default.

`GOOGLE_APPLICATION_CREDENTIALS` — optional service-account credentials path used by CI/test environments that run `gws` non-interactively. Normal users should authenticate with `gws auth login --scopes gmail.readonly` instead.

`SLASHCASH_GMAIL_QUERY` — optional runtime override for the Gmail query. The CLI normally sets this from `sync.gmailQuery`.

`SLASHCASH_SYNC_LIMIT` — optional runtime override for the number of Gmail messages to inspect. The CLI normally sets this from `sync.maxMessages`.

`SLASHCASH_SYNC_SKIP_AI` — developer/test override that lets the fixture ingest path skip local model extraction. No default.

`SLASHCASH_PORT` — optional override for the loopback port. Defaults to `3000`. The `--port` flag on `slashcash start` wins over both the config and this variable; the config value wins over this variable.

`SLASHCASH_NO_OPEN` — optional `slashcash start` override. Set to `1` to suppress opening the browser, mainly for tests and headless runs.

`SLASHCASH_USE_STANDALONE` — developer override that forces `slashcash start` to prefer a locally built standalone Next.js server when present. Published packages detect this automatically.

`NODE_OPTIONS` — passed through to the Next.js child. Not interpreted by `slashcash` itself.

## Test and release gates

`SLASHCASH_E2E` — enables hidden E2E-only CLI flags and skips host-touching onboard work in fixture scenarios. Never needed by users.

`SLASHCASH_E2E_PORT` — optional port override for phase E2E scenarios.

`SLASHCASH_DOCTOR_SKIP_OLLAMA` — set to `1` to make doctor treat Ollama checks as skipped in fixture/test runs.

`SLASHCASH_DOCTOR_SKIP_GWS` — set to `1` to make doctor treat `gws` checks as skipped in fixture/test runs.

`SLASHCASH_GWS_FIXTURE_DIR` — points the `gws` wrapper at committed fixture JSON instead of invoking the real `gws` binary.

`SLASHCASH_EVAL_SKIP_MODEL` — set to `1` for the CI fixture eval gate. It returns a deterministic passing fixture score without invoking a model.

`SLASHCASH_EVAL_THRESHOLD` — numeric eval threshold. Default `0.8`.

`SLASHCASH_BUNDLE_BUDGET_BYTES` — bundle-size ceiling for `pnpm bundle:check`. Default 350 MB unpacked.

`SLASHCASH_BENCH_VERSION_MS` — development-harness budget for `slashcash --version`. Default 1000 ms.

`SLASHCASH_BENCH_DOCTOR_QUICK_MS` — development-harness budget for `slashcash doctor --quick`. Default 3000 ms.

`PLAYWRIGHT_BASE_URL` and `CI` — Playwright controls used only by the E2E package.

## What we removed from the hosted codebase

These variables existed during the hosted SaaS era and are gone in the local-first codebase. Searches in the shipping code for any of them should return zero hits at the end of Phase 1.

Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Trigger.dev: `TRIGGER_SECRET_KEY`.

Google OAuth owned by us: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Remote AI providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`.

Eval tooling that required remote providers: `BRAINTRUST_API_KEY`, `MODEL_NAME` (as used by the eval harness).

Vercel surface: `VERCEL_URL`, `NEXT_PUBLIC_VERCEL_URL`, `NEXT_PUBLIC_SITE_URL`.

Postgres: `DATABASE_URL`.

Any remaining reference to these names in the repo after Phase 1 is either dead and deletable, or a bug.

## Where variables are read

The CLI sets most runtime variables before it starts the app or a sync job. Direct module readers are the paths module (`SLASHCASH_HOME`, `SQLITE_DB_PATH`), attachment helpers (`SLASHCASH_ATTACHMENTS_DIR`), provider factories (`OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL`, `OLLAMA_VISION_MODEL`), the start path (`SLASHCASH_PORT`, `SLASHCASH_NO_OPEN`, `SLASHCASH_USE_STANDALONE`), the sync runner (`SLASHCASH_GMAIL_QUERY`, `SLASHCASH_SYNC_LIMIT`, `SLASHCASH_SYNC_SKIP_AI`), doctor/onboard gates (`SLASHCASH_E2E`, `SLASHCASH_DOCTOR_SKIP_OLLAMA`, `SLASHCASH_DOCTOR_SKIP_GWS`, `GOOGLE_APPLICATION_CREDENTIALS`), and the `gws` wrapper (`GWS_PROFILE`, `SLASHCASH_GWS_FIXTURE_DIR`).

## Testing

The `packages/e2e-tests` suite uses its own fixture for `SLASHCASH_HOME` pointed at a temporary directory, so that test runs do not touch the developer's real `~/.slashcash/`. Phase 2 also sets `SLASHCASH_GWS_FIXTURE_DIR` and `SLASHCASH_SYNC_SKIP_AI=1` so the ingest path can be verified without a real Gmail account or local model.
