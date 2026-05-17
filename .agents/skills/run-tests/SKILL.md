---
name: run-tests
description: Choose and run the right slash.cash monorepo checks (typecheck, lint, Playwright e2e, eval gate, bench) based on what changed. Use when validating a PR or before landing a change.
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

## End-to-end (Playwright + onboarding script)

Browser journeys:

```bash
pnpm e2e:journeys
```

Full e2e package gate (Playwright, then onboarding fast-path):

```bash
pnpm e2e:all
```

Onboarding script only:

```bash
pnpm e2e:onboarding
```

Eval gate may need a model skip in CI-like environments:

```bash
SLASHCASH_EVAL_SKIP_MODEL=1 pnpm eval:gate
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
| `apps/main` UI / tRPC | `pnpm typecheck`, `pnpm test`, then `pnpm e2e:journeys` as needed |
| `packages/database` | `pnpm typecheck`, `pnpm test`, DB migrations sanity |
| Assistant / extraction | `pnpm eval:gate` when touching eval pipelines |
| Performance-sensitive paths | `pnpm bench` if applicable |

If a command fails with missing binaries, run `pnpm install` once and retry.
