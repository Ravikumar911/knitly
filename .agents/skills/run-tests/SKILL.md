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

## Closeout loop

For non-trivial changes, especially extraction or other user-visible behavior, run the autoreview closeout skill before landing:

```bash
.agents/skills/autoreview/scripts/autoreview --mode auto
```

The harness writes JSON and Markdown reports under `.agents/skills/autoreview/reports/`, verifies the changed scope, runs the relevant gates, and exits non-zero when it finds accepted/actionable findings. Treat every finding as advisory: read the cited real path and sibling surfaces before applying a fix, then rerun the loop until clean.

For ingest/extraction work, pair autoreview with focused extraction proof:

```bash
pnpm e2e:ingest
```

`pnpm e2e:ingest` writes `.agents/skills/ingest-proof/reports/latest/real-behavior-proof.{json,md}` using committed IMAP fixtures, both PDF extractor modes, and exported `@workspace/database` helpers. It fails when fixture expectations drift; run the proof harness directly with `--no-strict` only to collect evidence for a consciously deferred mismatch.

## Large ingest work

When the request is high-level, ongoing, or asks to sweep/close multiple Swiggy or food-delivery edge cases, use the Phase 4 orchestration wrapper before choosing individual gates:

```bash
.agents/skills/orchestrator/scripts/orchestrator \
  --mode ingest-edge-sweep \
  --once \
  --allow-noop \
  --report-name <descriptive-name>
```

The thin wrapper skill is `.agents/skills/ingest-edge-sweep/SKILL.md`. It delegates edge discovery and closeout to `.agents/skills/orchestrator/SKILL.md`, then expects the usual proof chain: evidence map, sibling analysis, `pnpm e2e:ingest`, autoreview, and a ledger under `.agents/skills/orchestrator/reports/`. Do not mark a sweep complete from inventory alone; cite the orchestrator report and exact proof artifacts.

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

| Change area                 | Prefer                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| Shared types / packages     | `pnpm typecheck` + affected package tests                         |
| `apps/main` UI / tRPC       | `pnpm typecheck`, `pnpm test`, then `pnpm e2e:journeys` as needed |
| `packages/database`         | `pnpm typecheck`, `pnpm test`, DB migrations sanity               |
| Assistant / extraction      | `pnpm eval:gate` when touching eval pipelines                     |
| Performance-sensitive paths | `pnpm bench` if applicable                                        |

If a command fails with missing binaries, run `pnpm install` once and retry.
