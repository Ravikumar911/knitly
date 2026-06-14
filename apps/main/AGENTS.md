# apps/main — Next.js dashboard

Scoped rules for `@knitly/main` (local slash.cash dashboard). Repo-wide rules live in [`AGENTS.md`](../../AGENTS.md), including the ClawSweeper-Style Review Policy for evidence maps, best-fix review, sibling analysis, and real behavior proof.

## Layout

- **App Router**: `app/` — routes, layouts, API route for tRPC.
- **tRPC**: `trpc/` — `init.ts` (context, procedures), `routers/`, `client.tsx`, `server.tsx`, `query-client.ts`.
- **HTTP adapter**: `app/api/trpc/[trpc]/route.ts` — wires Next.js to the tRPC handler.
- **UI**: Prefer `@workspace/ui` components; app-specific pieces under `components/`.

## tRPC v11 + TanStack Query

- **Types**: Import `AppRouter` from `trpc/routers/_app.ts` for end-to-end typing.
- **Client hook API**: `createTRPCContext` from `@trpc/tanstack-react-query` — see `trpc/client.tsx` for `TRPCReactProvider`, `useTRPC`, `httpBatchLink` to `/api/trpc`.
- **Server prefetch**: `trpc/server.tsx` exposes `getQueryClient`, `trpc` options proxy, `HydrateClient`, and `prefetch` — use these patterns for RSC + hydration.
- **Context**: `createTRPCContext` in `trpc/init.ts` uses `LOCAL_USER_ID` — this is a local single-user deployment, not hosted JWT auth.
- **Procedures**: Use `baseProcedure` / `protectedProcedure` from `trpc/init.ts`. Implement procedures by calling `@workspace/database` exports only.

## Data and AI

- **Database**: No Drizzle in this app — delegate to tRPC procedures that call `@workspace/database`.
- **AI**: Vercel AI SDK v5 (`ai` package) and `@ai-sdk/react` for client hooks; align with existing assistant/chat code under `components/assistant` and related routes.
- **Agentic closeout**: tRPC, AI, and UI changes still follow the patterns above. Any cross-cutting work that touches or depends on deterministic ingest/extraction must also follow the root ClawSweeper-Style Review Policy and cite the relevant `packages/tasks`/`packages/pdf-extractor` evidence.

## Environment

- **Port**: `SLASHCASH_PORT` or `PORT` (see `trpc/client.tsx` `getUrl()` for server-side absolute URL to tRPC).
- **Assistant providers**: read from `~/.slashcash/config.json` (`assistant.*`) and optional provider API keys; ingest is independent of this setup.

## Verification

```bash
pnpm --filter @knitly/main typecheck
pnpm --filter @knitly/main test
pnpm --filter @knitly/main lint
```

For full-stack checks from monorepo root, see root `AGENTS.md` and skill `run-tests`.
