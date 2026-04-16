# slashcash — local personal finance agent

Slashcash is a **local-first personal finance assistant** focused on Swiggy spend analysis.

It runs fully on your machine with:
- local PostgreSQL
- local Gemma 4 (via Ollama)
- local app runtime (main product only, no separate website app needed)

## First-time user (fresh machine)

If you have only Node/npm installed, run:

```bash
npm i -g slash-cash
slashcash onboard
slashcash start
```

`slashcash onboard` is designed for first-time users:
- on macOS, it installs missing dependencies with Homebrew
- ensures Docker is running
- ensures Ollama is installed and `gemma4` is pulled
- bootstraps local DB + migrations + seed data
- writes local env files for the app

Open: <http://localhost:3000>

## Commands

```bash
slashcash onboard [--yes]  # full machine+app setup
slashcash doctor           # check local dependencies and daemon status
slashcash status           # verify postgres container + gemma4 availability
slashcash start            # run personal finance app in dev mode
```

## What local setup configures

Onboarding prepares:
1. Docker PostgreSQL container (`slashcash-postgres`)
2. Required compatibility table `auth.users`
3. Database migrations
4. Seeded local user + Swiggy transactions
5. Local env config:
   - `LOCAL_MODE=true`
   - `LOCAL_LLM_MODEL=gemma4`
   - `LOCAL_LLM_BASE_URL=http://127.0.0.1:11434/v1`

## Scope: personal finance app only

The CLI runs only the **main personal finance app** (`@knitly/main`).
It does not require or run any separate marketing website project.

## Current data source

Current local ingestion focus is Swiggy.
Gmail/Trigger-based sync is intentionally bypassed in local mode.
Use seeded/demo data or write rows to `transactions_v2`.
