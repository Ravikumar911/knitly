# @workspace/database

SQLite database package for slash.cash.

## Overview

This package owns:

- Drizzle schema definitions
- SQLite migration SQL
- Query helpers
- Deterministic local seed data

The default database file is `~/.slashcash/db.sqlite`. Set `SQLITE_DB_PATH` to override it.

## Commands

```bash
pnpm --filter @workspace/database build
pnpm --filter slashcash dev -- db seed
pnpm --filter slashcash dev -- db reset --yes
```

## Directory Structure

```text
packages/database
├── drizzle
├── src
│   ├── queries
│   ├── schema
│   ├── seed
│   └── index.ts
├── drizzle.config.ts
└── package.json
```
