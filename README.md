# slash.cash

Local-first personal finance dashboard built with Next.js, SQLite, Drizzle ORM, tRPC, and Ollama-compatible local AI.

> **Pivot in progress (2026-04-22).** Gmail access is moving from the `gws`/`gcloud` flow to IMAP + a user-generated Gmail app password, and the CLI onboarding is being rebased onto an interactive wizard (`@clack/prompts`, modelled on `../openclaw/src/wizard/*`). Active plan: [`packages/docs/roadmap/pivot-imap.md`](./packages/docs/roadmap/pivot-imap.md). ADRs: [`ADR-024`](./packages/docs/reference/decisions.md#adr-024--gmail-access-via-imap--user-issued-app-password), [`ADR-025`](./packages/docs/reference/decisions.md#adr-025--interactive-onboarding-wizard-on-clackprompts). References in this README to `gws` / `gcloud` are kept for historical continuity; new installs should follow the pivot plan.

## Project Structure

```text
.
├── apps/
│   ├── main/              # Local dashboard app
│   └── website/           # Marketing website
└── packages/
    ├── cli/               # slashcash command-line launcher
    ├── database/          # SQLite schema, migrations, queries, and seed data
    ├── e2e-tests/         # Playwright scenarios
    ├── evals/             # Local extraction evaluations
    ├── tasks/             # Local ingestion/extraction helpers
    ├── typescript-config/ # Shared TypeScript configuration
    └── ui/                # Shared UI components
```

## Local Feature Scope

The current local app runs fully on the developer machine:

- SQLite database in `~/.slashcash/db.sqlite` by default.
- No hosted auth, remote job queue, cloud storage, or hosted database.
- Ollama-compatible chat/extraction models through `OLLAMA_BASE_URL` and `OLLAMA_CHAT_MODEL`.
- A `slashcash` CLI for onboarding, start, stop, status, doctor, config, db, sync, skills, and logs commands.
- Gmail ingestion over IMAP (`imap.gmail.com:993`) using a user-generated app password stored in the macOS Keychain. The legacy `gws` path is being retired; see [`packages/docs/roadmap/pivot-imap.md`](./packages/docs/roadmap/pivot-imap.md).
- Local PDF attachment storage under `~/.slashcash/attachments`.
- Typed SQLite-backed Swiggy analytics tools for the assistant.

## Prerequisites

- Node.js 20 or newer
- pnpm 10.4.1 or newer
- Optional for fixture/dev flows: `SLASHCASH_SYNC_SKIP_AI=1`
- Ollama for local parsing (installed by `slashcash onboard` on macOS).
- A Gmail account with 2-Step Verification enabled and a 16-character app password generated at <https://myaccount.google.com/apppasswords>. `slashcash onboard` walks you through this.

## Install

```bash
pnpm install
```

Published install path:

```bash
npm i -g slashcash
slashcash onboard
```

Optional local settings:

```bash
cp .env.example .env.local
```

## Run

```bash
pnpm slashcash -- start
```

Useful direct commands:

```bash
pnpm --filter slashcash dev -- doctor --fix
pnpm --filter slashcash dev -- onboard --dry-run
pnpm --filter slashcash dev -- sync --full
pnpm --filter slashcash dev -- db seed
pnpm --filter @knitly/main dev
```

The dashboard runs at `http://127.0.0.1:3000` by default.

## Database

The database package owns schema definitions, migrations, seed data, and query helpers.

```bash
pnpm --filter @workspace/database build
pnpm --filter slashcash dev -- db seed
pnpm --filter slashcash dev -- db reset --yes
```

Set `SQLITE_DB_PATH` to use a different SQLite file.

## Tests

```bash
pnpm typecheck
pnpm lint
pnpm architecture-smells
pnpm fixtures:check
pnpm e2e:all
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm e2e:phase-5
pnpm bench
```

For local doctor checks without requiring Ollama:

```bash
SLASHCASH_DOCTOR_SKIP_OLLAMA=1 pnpm --filter slashcash dev -- doctor
```

## Tech Stack

- Next.js App Router
- SQLite with Drizzle ORM
- tRPC and TanStack Query
- shadcn/ui and Tailwind CSS
- AI SDK with an OpenAI-compatible local endpoint
- Turborepo and pnpm workspaces
