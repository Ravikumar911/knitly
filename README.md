# slash.cash

Local-first personal finance dashboard built with Next.js, SQLite, Drizzle ORM, tRPC, deterministic local ingest, and optional assistant AI.

> Gmail sync uses IMAP + a user-generated Gmail app password. Swiggy extraction is deterministic Python-backed ingest; chat providers are configured later from the assistant tab or `slashcash assistant`.

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
- Optional assistant providers configured with `slashcash assistant`.
- A `slashcash` CLI for onboarding, start, stop, status, doctor, reset, config, db, sync, assistant, skills, and logs commands.
- Gmail ingestion over IMAP (`imap.gmail.com:993`) using a user-generated app password stored in the macOS Keychain or `~/.slashcash/credentials.json` when Keychain is unavailable.
- Local PDF attachment storage under `~/.slashcash/attachments`.
- Typed SQLite-backed Swiggy analytics tools for the assistant.

## Prerequisites

- Node.js 20 or newer
- pnpm 10.4.1 or newer
- Optional: Ollama if you want local assistant chat after onboarding.
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
pnpm --filter slashcash dev -- reset --yes
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
pnpm eval:gate
pnpm bench
```

For local doctor checks without requiring Ollama:

```bash
SLASHCASH_DOCTOR_SKIP_OLLAMA=1 pnpm --filter slashcash dev -- doctor
```

Package verification notes for published releases live in [`packages/docs/reference/release.md`](./packages/docs/reference/release.md).

## Tech Stack

- Next.js App Router
- SQLite with Drizzle ORM
- tRPC and TanStack Query
- shadcn/ui and Tailwind CSS
- AI SDK for the dashboard assistant
- Turborepo and pnpm workspaces
