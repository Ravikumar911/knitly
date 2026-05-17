# @knitly/main

Local dashboard app for slash.cash.

## Run

```bash
pnpm --filter @knitly/main dev
```

Open `http://localhost:3000`.

## Local Runtime

- The app always uses the local user.
- Database access goes through `@workspace/database`.
- Assistant chat is optional and reads `SLASHCASH_ASSISTANT_*` provider config or `~/.slashcash/config.json`.
- `/api/healthz` reports local runtime status.

## Build

```bash
pnpm --filter @knitly/main typecheck
pnpm --filter @knitly/main build
```
