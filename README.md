# slash.cash

Local-first personal finance dashboard built with Next.js, SQLite, Drizzle ORM, tRPC, and Ollama-compatible local AI.

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

## Phase 1 Scope

Phase 1 runs fully on the developer machine:

- SQLite database in `~/.slashcash/db.sqlite` by default.
- A deterministic local user with seeded Swiggy transactions.
- No hosted auth, remote job queue, cloud storage, or hosted database.
- Ollama-compatible chat/extraction models through `OLLAMA_BASE_URL` and `OLLAMA_CHAT_MODEL`.
- A `slashcash` CLI for start, stop, status, doctor, config, db, sync, skills, and logs commands.

Gmail ingestion and attachment processing are Phase 2 work. Phase 1 keeps local placeholders where the UI already has sync affordances.

## Prerequisites

- Node.js 20 or newer
- pnpm 10.4.1 or newer
- Optional: Ollama running locally for assistant and extraction flows

## Install

```bash
pnpm install
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
pnpm --filter @workspace/e2e-tests e2e:phase-1
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
