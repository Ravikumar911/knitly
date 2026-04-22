---
name: run-tests
description: Choose and run the right slash.cash monorepo checks (typecheck, lint, e2e phases, eval gate, bench) based on what changed. Use when validating a PR or before landing a change.
---

# Run tests and checks

## Default local loop

From repo root:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Broader quality gates

```bash
pnpm architecture-smells
pnpm fixtures:check
```

## End-to-end (Playwright)

Run a single phase while iterating:

```bash
pnpm e2e:phase-1
pnpm e2e:phase-2
pnpm e2e:phase-3
pnpm e2e:phase-4
pnpm e2e:phase-5
```

Full suite:

```bash
pnpm e2e:all
```

Phase 5 may need a model skip in CI-like environments:

```bash
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm e2e:phase-5
```

## Evaluations and benchmarks

```bash
pnpm eval:gate
pnpm bench
```

## What to run by surface

| Change area | Prefer |
|-------------|--------|
| Shared types / packages | `pnpm typecheck` + affected package tests |
| `apps/main` UI / tRPC | `pnpm typecheck`, `pnpm test`, then relevant `e2e:phase-*` |
| `packages/database` | `pnpm typecheck`, `pnpm test`, DB migrations sanity |
| Assistant / extraction | `pnpm eval:gate` when touching eval pipelines |
| Performance-sensitive paths | `pnpm bench` if applicable |

If a command fails with missing binaries, run `pnpm install` once and retry.
