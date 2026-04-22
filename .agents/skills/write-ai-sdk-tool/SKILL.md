---
name: write-ai-sdk-tool
description: Implement chat or tool-calling features using Vercel AI SDK v5 and @ai-sdk/react in this repo. Use when adding assistant features, streaming, or structured tool output.
---

# Write AI SDK v5 features

## Stack

- Server: `ai` package (aligned with root `package.json` / `apps/main` dependencies).
- React hooks: `@ai-sdk/react` (not legacy `ai/react` unless the codebase already standardizes otherwise).

## Principles

1. **Streaming-first** — Prefer streaming text and structured steps where the UX benefits.
2. **Boundaries** — Keep model calls and tool execution on the server (Route Handlers / server actions / tRPC), not in client-only bundles for secrets.
3. **Types** — Type tool inputs/outputs; use Zod at boundaries when exposing tools to models.
4. **Local models** — Ollama-compatible endpoints use `OLLAMA_BASE_URL` / `OLLAMA_CHAT_MODEL` (see `.env.example`).

## Typical flow

1. Define tools and model configuration in server code (see existing chat routers and assistant components under `apps/main` and `packages/ui`).
2. Use TanStack Query + tRPC for non-streaming data; use AI SDK streaming APIs for chat UIs.
3. Persist chat or structured results via `@workspace/database` helpers, not ad hoc files.

## Verify

- `pnpm typecheck`
- Manual: run dashboard and exercise the assistant path against local Ollama if applicable.
