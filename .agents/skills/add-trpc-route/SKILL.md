---
name: add-trpc-route
description: Add a type-safe tRPC v11 procedure in apps/main backed by @workspace/database query helpers only. Use when exposing new server APIs to the dashboard.
---

# Add a tRPC route

## Rules

1. **No raw SQL in routers** — import typed helpers from `@workspace/database` only.
2. **Context** — `apps/main/trpc/init.ts` defines `Context` (local `userId` from `LOCAL_USER_ID`). Use `protectedProcedure` when the caller must be authenticated in the sense of “has user id”.
3. **Compose routers** — register new routers in `apps/main/trpc/routers/_app.ts`.

## Steps

1. **Database first** (if new data access is needed)

   - Add query functions under `packages/database/src/queries/`.
   - Export from `packages/database/src/index.ts`.
   - Run `pnpm --filter @workspace/database build` if consumers need built output.

2. **Create or extend a router** under `apps/main/trpc/routers/<feature>.ts`:

   - Import `createTRPCRouter`, `baseProcedure` or `protectedProcedure`, and `createTRPCRouter` pattern from `../init`.
   - Use Zod (or existing input schemas) for `.input()`.

3. **Wire the router** in `trpc/routers/_app.ts`:

   ```ts
   export const appRouter = createTRPCRouter({
     // ...
     myFeature: myFeatureRouter,
   });
   ```

4. **Client usage** — follow existing `apps/main/trpc/client.tsx` + TanStack Query patterns; infer types via `AppRouter` from `trpc/routers/_app.ts`.

5. **Verify** — `pnpm typecheck` and exercise the procedure from the UI or a small test.

## API route

The HTTP adapter lives at `apps/main/app/api/trpc/[trpc]/route.ts` — usually no change needed when adding procedures.
