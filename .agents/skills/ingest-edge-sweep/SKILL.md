---
name: ingest-edge-sweep
description: Delegate high-level Swiggy or food-delivery ingest edge discovery, proof, and narrow landable fixes to the Phase 4 orchestrator runner/skill. Use when asked to sweep, close, triage, or maintain deterministic ingest edge cases with autoreview and real behavior proof.
---

# Ingest Edge Sweep

Use this skill as a thin wrapper over the Phase 4 orchestrator. Do not reimplement orchestration here.

Use it when the user asks for a high-level ingest handoff, an edge sweep, or maintenance work where the right candidate is not known upfront. For a single already-scoped code change, use `.agents/skills/autoreview` and `.agents/skills/ingest-proof` directly.

## Delegate

1. Read `.agents/skills/orchestrator/SKILL.md`. If it is missing, stop and report that Phase 4 orchestrator files are not available in this checkout; do not create or edit them from this skill.
2. Invoke the orchestrator runner's ingest-edge-sweep mode from the repo root. Use the runner path and flags documented by the orchestrator skill.
3. Give the orchestrator a narrow goal: discover one family of deterministic Swiggy/food-delivery ingest edges, choose only high-confidence live-testable work, and produce one landable unit at a time.
4. Require isolated worker state, a visible ledger/report, one completion or failure notification per worker, and repo-root-relative citations.

**Clarity note (Phase 4 narrow completion):** Orchestrator runner is helper (provides inventory/claim/ledger/wake; see its report at e.g. orchestrator.mjs:146 for report build + :465 render). The *agent-driven* main thread (explorer/implementer/verifier subagents) wires visible primitives: `spawn_subagent` for delegation (see explorer report ID 019ebff0-40d2-71c2-a23f-29275bfcadd7), `todo_write` (full cycle exercised for inventory/select/delegate/verify stages), plan mode for decomp. Durable 5-min uses `scheduler_create` in agent context (or polling+todo); reports now include landableUnit (branch example, PR stub with "Subagent traces: [IDs]", "Proof bundle: .../real-behavior-proof.md (exact values: schemaUsed=...)", "Evidence map + siblings per AGENTS.md:117"). Light update only; preserve all prior contract, no pipeline/qa touches.

## Sweep Contract

- Keep ingest work inside approved deterministic surfaces: `packages/tasks`, `packages/pdf-extractor`, committed IMAP fixtures, goldens, and future `qa/scenarios/ingest`.
- Require sibling analysis across `pipeline.ts`, `body-fallback.ts`, `swiggy-body-signals.ts`, `merchants/*`, pdf-extractor schema/parity code, fixture expectations, goldens, and provenance handling.
- Use `.agents/skills/autoreview` for every non-trivial candidate change; verify findings against real paths before accepting them.
- Use `.agents/skills/ingest-proof` / `pnpm e2e:ingest` for real behavior proof; cite exact `schemaUsed`, `dataSource`, provenance, amounts, item names, order IDs, and warnings where relevant.
- Prefer narrow fixes at the owner boundary. Do not add hosted services, non-deterministic ingest behavior, or database access outside exported `@workspace/database` helpers.
- If Phase 5 `qa/scenarios/ingest` exists, update or cite the relevant scenarios. If it does not exist, cite the manual evidence map and proof artifact used instead.
- Treat inventory-only or `--allow-noop` runs as discovery evidence, not as shipped edge closure.

## Closeout

Return:

- orchestrator command or explicit blocker
- ledger/report path
- worker IDs or thread IDs when available
- candidate selected, whether it was covered or a coverage gap, and whether any code or fixture changed
- changed paths
- evidence map and sibling surfaces checked
- autoreview result
- ingest-proof artifact path and exact observed values
- tests run, including `pnpm e2e:ingest` for ingest changes
- shipped decision: either "landable and proven" with artifacts, or "not shipped" with the missing proof step
