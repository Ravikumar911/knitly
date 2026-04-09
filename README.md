# slashcash (local-first)

Run Slashcash end-to-end on your machine with:
- local PostgreSQL (Docker)
- no Supabase login requirement
- no Google OAuth requirement
- no Trigger.dev/Gmail dependency for initial run
- local OpenAI-compatible model endpoint (default model: `gemma4`)

---

## 1) Install CLI and run onboarding

From this repo root:

```bash
npm i -g .
slashcash doctor
slashcash onboard
```

You can run non-interactive onboarding with defaults:

```bash
slashcash onboard --yes
```

Then start the app:

```bash
slashcash start
```

Open <http://localhost:3000>.

---

## 2) CLI commands

```bash
slashcash onboard [--yes]   # setup DB + migrations + seed + env files
slashcash doctor            # validate local prerequisites
slashcash status            # check postgres container status
slashcash start             # run main app in dev mode
```

The onboarding wizard asks for:
- DB host/port/user/password/name
- local model base URL
- default model id

---

## 3) What onboarding configures

`slashcash onboard` will:
1. Start `postgres:16` via Docker compose
2. Create minimal `auth.users` table (compatibility for existing foreign keys)
3. Install dependencies
4. Run Drizzle migrations
5. Seed one local user and sample Swiggy transactions
6. Write `apps/main/.env.local` and `packages/database/.env.local`

---

## 4) Local model (Gemma) notes

By default the app expects an OpenAI-compatible endpoint at:
- `LOCAL_LLM_BASE_URL=http://127.0.0.1:11434/v1`
- `LOCAL_LLM_MODEL=gemma4`

If you use Ollama and your model id differs, set it in `apps/main/.env.local`.

---

## 5) Swiggy spend ingestion without Gmail

Local mode disables Gmail sync paths intentionally. Use one of these ingestion paths:
- seed/demo data (included by onboarding)
- CSV/PDF import pipeline that writes to `transactions_v2`
- parser for exported statements/messages that writes normalized `transactions_v2` rows

Required fields for analytics/assistant:
- `user_id`
- `merchant_id='swiggy'`
- `amount`
- `transaction_date`
- optional metadata in `merchant_data`

---

## 6) Docker service

`docker-compose.yml` provides:
- `slashcash-postgres` on `localhost:5432`
- default credentials: `slash/slash`
- database: `slashcash`

