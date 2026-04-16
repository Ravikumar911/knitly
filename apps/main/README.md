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
- AI chat uses `OLLAMA_BASE_URL` and `OLLAMA_CHAT_MODEL`.
- `/api/healthz` reports local runtime status.

## Build

```bash
pnpm --filter @knitly/main typecheck
pnpm --filter @knitly/main build
```
