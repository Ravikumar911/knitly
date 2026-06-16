# qa/ — Living Contracts for Ingest Edges (Phase 5)

**Purpose**: Per the OpenClaw model adopted in `packages/docs/roadmap/agentic-coding-adoption.md:334-361`, `qa/scenarios/` turns the "messy reality" table from `packages/docs/roadmap/phase-5.md:15-26` (9 ingest/food-delivery edges) into executable, auditable living contracts. These are used for:

- Regression detection on deterministic Swiggy pipeline changes.
- Coverage tracking (fixture parity + dogfood).
- Autonomous sweeps/orchestration (via `.agents/skills/ingest-edge-sweep`, `.agents/skills/orchestrator`).
- Closeout evidence in autoreview + ClawSweeper review policy (`AGENTS.md:101-124`).

Scenarios encode:
- Clean state setup via exported DB helpers only (`@workspace/database`).
- Drive paths: real-behavior-proof harness (preferred) or direct `runEmailSync` + pipeline entry.
- Precise asserts on `getTransactionsWithEmails` results: `schemaUsed`, `dataSource`, `provenance`, `amount`, `orderId`, `itemNames`, `warnings`, `reason`, `kind` (processed/skipped_*/failed), reads-before-writes ordering.
- jsonl replays for pipeline decision branches (e.g. PDF deterministic vs body fallback).
- Ties to goldens (pdf-extractor), committed fixtures (`packages/e2e-tests/fixtures/imap/*.eml` + `*.expected.json`), and proof bundles (`.agents/skills/ingest-proof/reports/latest/real-behavior-proof.{json,md}`).

**Do not duplicate DB logic**: all queries go through exports in `packages/database/src/index.ts` (e.g. `getTransactionsWithEmails`, `clearLocalSeedData`, `ensureLocalDatabase`, `LOCAL_USER_ID`, `getTransactionsCount`).

## How to run
- Committed fixture proof (exercises the 4 covered edges): `pnpm e2e:ingest` (strict; see `packages/e2e-tests/package.json:13`).
  - Invokes `packages/e2e-tests/scripts/real-behavior-proof.ts --strict --output-dir ../../.agents/skills/ingest-proof/reports/latest`.
  - Produces bundle with exact per-fixture `actual` (schemaUsed/dataSource/provenance/amounts/orderIds/warnings/itemNames/reason + 0 diffs on green).
- Targeted: `pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --mode pdf-enabled --fixture swiggy-body-only`.
- Scenario inventory gate: `pnpm qa:ingest` checks the Phase 5 inventory, committed fixture coverage, detailed duplicate/scanned contracts, and replay JSONL shape.
- Verify coverage: the inventory in `qa/scenarios/index.md` + `qa/scenarios/ingest/food-delivery-edges.md` is the source of truth; a coverage stub would parse frontmatter/scenario files + fixture dir vs phase-5 table.

**Parity tiers** (per plan):
- Fixture (committed .eml + expected.json + proof harness roundtrip).
- Dogfood (real Gmail + app password + `dogfood-diff.ts`; manual note in `current-state.md`).

Ties:
- `.agents/skills/ingest-proof/SKILL.md` (runs proof harness, writes bundles).
- `.agents/skills/autoreview` (ingest-edge findings must cite qa scenarios + proof).
- `.agents/skills/orchestrator` + `ingest-edge-sweep` (for sweeping gaps).
- `pnpm fixtures:check` (validates .eml/.expected + canonical JSON; `packages/e2e-tests/scripts/fixtures-check.ts:61`).
- `packages/docs/reference/testing.md` (cross-refs qa/ as canonical positive enforcement).
- `AGENTS.md:113`: "Use scenarios as living contracts: once `qa/scenarios/` exists (Phase 5), changes must update or cite the relevant scenarios, especially for ingest edge cases."
- `AGENTS.md:118`: sibling analysis required for any touch to `packages/tasks/src/extract/**`, `packages/e2e-tests/fixtures/imap/**`, or `qa/scenarios/ingest/**`.

## Structure
- `qa/scenarios.md` + `qa/scenarios/index.md`: pack-style overview + coverage inventory (9 edges from phase-5.md table).
- `qa/scenarios/ingest/food-delivery-edges.md`: primary scenario family (qa-flow + frontmatter).
- `qa/scenarios/ingest/replays/*.jsonl`: decision path replays (e.g. pdf-vs-body.jsonl citing `packages/tasks/src/extract/pipeline.ts:114` deterministic, `:140` body-fallback).
- The 3 remaining fixture gaps stay explicit so coverage reports do not overclaim; duplicate/scanned are detailed non-fixture contracts until real fixtures land.

All paths repo-root relative. Citations use exact lines from current shipped (post-Phase 4 re-verify green).

## Updates needed later (tracked in phase-5.md crossref + this README)
- Expand `pnpm qa:ingest` from inventory validation into a full scenario executor if/when the scenario format grows beyond Markdown + replay contracts.
- Add a positive architecture/scenario inventory check if the scenario pack grows beyond manual review + proof harness coverage.
- Refresh e2e driver (`real-behavior-proof.ts` or onboarding) to assert against qa/ contracts where possible.
- Expand `phase-5.md` table + fixtures when gaps close (Instamart etc.); scenarios must stay in sync.
- Add `qa/scenarios/ingest/` to `fixtures:check` walk or dedicated gate.
- Verifier subagent (per "How to use this plan") runs scenarios (stub via tsx harness driving proof + direct asserts; or full on new fixtures).
- Keep `AGENTS.md`, the adoption plan, and testing docs in sync whenever scenario execution changes.

See `packages/docs/roadmap/phase-5.md:15-26` (table), `agentic-coding-adoption.md:334-361` (work items 294-306 + verification 326-338), `real-behavior-proof.ts:267` (getTransactionsWithEmails), `pipeline.ts:140` (body fallback branch), `packages/database/src/index.ts:22`, `packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:5`, and latest proof bundle `.agents/skills/ingest-proof/reports/latest/real-behavior-proof.md:34`.
