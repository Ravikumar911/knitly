---
name: add-database-query
description: Add or change SQLite data access via Drizzle only inside packages/database. Use when persisting or reading data for slash.cash.
---

# Add a database query

## Invariant

**All** Drizzle/SQLite access for app features lives in `packages/database`:

- Schemas: `packages/database/src/schema/`
- Queries: `packages/database/src/queries/**`
- Client: `packages/database/src/client.ts`
- Public exports: `packages/database/src/index.ts`

`apps/main`, `packages/tasks`, and other packages must **not** open their own DB connections or embed ad hoc `db.select` calls.

## Steps

1. **Schema** — If tables/columns change, update schema files and generate migrations using the package scripts (`generate`, `migrate`, `check` in `packages/database/package.json`).

2. **Query module** — Add a focused module under `src/queries/<area>/<name>.ts` with typed functions returning domain-friendly shapes.

3. **Export** — Re-export from `src/index.ts` so consumers use `@workspace/database`.

4. **Consumers** — Call the new helpers from tRPC procedures (`apps/main/trpc/`) or tasks (`packages/tasks/`), not inline SQL.

5. **Tests** — Add or extend tests under `packages/database` where behavior is non-trivial.

## Agentic closeout

For non-trivial query or schema work, follow the root ClawSweeper policy in `AGENTS.md`: build an evidence map, ask whether the query belongs in `packages/database`, inspect callers/callees and sibling queries, then run focused database tests plus `.agents/skills/autoreview/scripts/autoreview` until it reports 0 actionable findings. If the query supports ingest/extraction, also update or cite `qa/scenarios/ingest/**`, run `pnpm qa:ingest` and `pnpm e2e:ingest`, and record the proof bundle.

## Anti-patterns

- Duplicating queries in tRPC routers or React components.
- Importing `@workspace/database` schema internals from apps without going through exported query helpers (discouraged for consistency).
