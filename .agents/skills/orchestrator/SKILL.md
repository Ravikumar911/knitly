---
name: orchestrator
description: Coordinate slash.cash high-level agentic work by inventorying roadmap/QA coverage, delegating bounded subagents, running proof and autoreview gates, and writing traceable orchestration ledgers. Use for Phase 4-style handoffs, ingest sweeps, background/polling simulations, and multi-worker closeout.
---

# Orchestrator

Use this skill when a high-level goal needs decomposition, subagent delegation, proof collection, and a landable closeout report. Keep runs local-first and bounded: prefer `--once` for real work and use short polling simulations only to prove the wake/monitor contract.

Typical ingest sweep:

```bash
.agents/skills/orchestrator/scripts/orchestrator \
  --mode ingest-edge-sweep \
  --once \
  --allow-noop \
  --candidate swiggy-order-with-pdf \
  --report-name phase-4-live-cycle \
  --worker explorer=<subagent-id> \
  --worker implementer=<subagent-id> \
  --worker verifier=<subagent-id>
```

Use `--candidate <fixture-id>` for intentional live proof against a known committed
fixture, or `--prefer-covered` to pick an existing fixture before Phase 5 gaps. Leave
both unset with `--allow-noop` when the goal is to ledger the first missing Phase 5
fixture without editing fixtures.

Short wake simulation:

```bash
.agents/skills/orchestrator/scripts/orchestrator \
  --mode ingest-edge-sweep \
  --simulate \
  --ticks 2 \
  --wake-ms 1000 \
  --report-name phase-4-wake-sim
```

## Contract

- Read the active roadmap, `AGENTS.md`, existing proof reports, and current fixture/QA coverage before selecting work.
- Use real subagents for non-trivial exploration, implementation, and verification; pass their IDs with `--worker role=id` so the ledger is auditable.
- Select narrow candidates that are vision-fit, owner-bounded, and proofable. For ingest work, prefer committed fixture or scenario gaps from `packages/docs/roadmap/phase-5.md`.
- Claim one candidate at a time, record state transitions, and expire or block rather than drifting into broad refactors.
- Run proof before claiming success. Ingest cycles must run `pnpm e2e:ingest` and autoreview with the ingest proof gate.
- Write JSON and Markdown reports under `.agents/skills/orchestrator/reports/`, plus the stable `latest/orchestrator-run.{json,md}` bundle.

## States

`idle -> inventory -> candidate_selected -> claimed -> delegated -> proof_running -> autoreview_running -> verified -> ledgered -> done`

Failure states are `expired`, `blocked`, and `actionable_findings`.

## Closeout

After any live cycle, cite:

- orchestrator report
- subagent IDs and roles
- ingest proof bundle, if applicable
- autoreview report
- exact command outcomes
- evidence map and best-fix judgment

## Agent-driven flow and primitives (addresses explorer report gaps)

The orchestrator runner (`.agents/skills/orchestrator/scripts/orchestrator.mjs`) is the *helper* (inventory via buildInventory citing e.g. orchestrator.mjs:312, claim/ledger via writeReports + renderMarkdown, simulateWake for polling).

*Agent-driven* flow (the main thread / implementer / explorer):
- Spawns workers with `spawn_subagent` (subagent_type e.g. read-write implementer, background:true, focused prompt; see adoption.md:37, :269).
- Uses `todo_write` for state across delegation (internal stages: inventory, select, delegate, verify -- this subagent's checklist does exactly one full cycle; see todo writes).
- Uses `plan mode` (enter_plan_mode / exit_plan_mode) for high-level decomp before heavy edits.
- Records traces via `--worker role=id` (subagent IDs in ledger).
- For durable-ish 5-min wake simulation: in agent context, use `scheduler_create` (interval "5m", recurring, prompt that drives orchestrator/worker) + polling + todo state as fallback (exercised + noted in runner simulateWake + reports; see mjs header comments and wake sim at ~380).

Reports/ledger now include `landableUnit` (in JSON + rendered MD) with:
- `suggestedBranch` + `exampleGitCommand` (e.g. `git checkout -b phase4-ingest-sweep-xxx`)
- `suggestedPRTitle` + `suggestedPRBody` stub: includes "Subagent traces: [IDs]", "Proof bundle: .agents/.../real-behavior-proof.md (exact values: schemaUsed=...)", "Evidence map + siblings per AGENTS.md:117".

Update only lightly for clarity; all existing behavior, schema (additive), PHASE_5_FIXTURES, gates, evidenceMap, best-fix, sibling citations preserved. Runner sourcesRead + evidenceMap still cite e.g. adoption 241-288, AGENTS.md:103-123, pipeline etc. (without touching pipeline).

## Landable output support

Every report now supports/document "landable output" for closeout. Use the emitted landableUnit in PRs. For one report example see rendered sections in phase-4-*.md (or fresh runs). The calling agent (not runner) performs the actual subagent spawn + todo_write cycle.
