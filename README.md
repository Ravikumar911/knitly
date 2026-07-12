# slash.cash

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](./LICENSE)

Local-first personal finance dashboard built with Next.js, SQLite, Drizzle ORM, tRPC, deterministic local ingest, and optional assistant AI.

## Open source

This repository is open source under the [ISC License](./LICENSE). Contributions are welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md). To report a security issue, follow [`SECURITY.md`](./SECURITY.md).

> Gmail sync uses IMAP + a user-generated Gmail app password. Swiggy extraction is deterministic Python-backed ingest; chat providers are configured later from the assistant tab. End users install the **Desktop app** (ADR-028); public `npm i -g slashcash` is not the product path.

## Project Structure

```text
.
├── apps/
│   ├── main/              # Local dashboard app
│   ├── desktop/           # Electron shell (primary distribution)
│   └── website/           # Marketing website
└── packages/
    ├── cli/               # Bundled runtime (slashcash) — not the end-user install CTA
    ├── database/          # SQLite schema, migrations, queries, and seed data
    ├── e2e-tests/         # Playwright scenarios
    ├── evals/             # Local extraction evaluations
    ├── tasks/             # Local ingestion/extraction helpers
    ├── typescript-config/ # Shared TypeScript configuration
    └── ui/                # Shared UI components
```

## Local Feature Scope

The current local app runs fully on the developer machine:

- SQLite database in `~/.slashcash/db.sqlite` by default (**State directory**).
- No hosted auth, remote job queue, cloud storage, or hosted database.
- Optional assistant providers configured from the assistant tab (or maintainer `pnpm slashcash -- assistant`).
- Desktop app as primary distribution; `packages/cli` as the **Bundled runtime** for server supervision and machine-side setup.
- Gmail ingestion over IMAP (`imap.gmail.com:993`) using a user-generated app password stored in the macOS Keychain or `~/.slashcash/credentials.json` when Keychain is unavailable.
- Local PDF attachment storage under `~/.slashcash/attachments`.
- Typed SQLite-backed Swiggy analytics tools for the assistant.

## Prerequisites

- Node.js 20 or newer
- pnpm 10.4.1 or newer
- Optional: Ollama if you want local assistant chat after onboarding.
- A Gmail account with 2-Step Verification enabled and a 16-character app password generated at <https://myaccount.google.com/apppasswords>. Desktop onboarding walks end users through this; maintainers can use the monorepo CLI helpers below.

## Install (end users)

Download the macOS **Desktop app** from the website (**Download for Mac**) / GitHub Releases. Do not use `npm i -g slashcash` as the product install path (ADR-028).

## Install (contributors)

```bash
pnpm install
```

Optional local settings:

```bash
cp .env.example .env.local
```

## Run (contributors)

```bash
pnpm slashcash -- start
```

Useful direct commands:

```bash
pnpm --filter slashcash dev -- doctor --fix
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

Desktop / release verification notes live in [`packages/docs/reference/release.md`](./packages/docs/reference/release.md).

## Tech Stack

- Next.js App Router
- SQLite with Drizzle ORM
- tRPC and TanStack Query
- shadcn/ui and Tailwind CSS
- AI SDK for the dashboard assistant
- Electron desktop shell (primary distribution)
- Turborepo and pnpm workspaces
