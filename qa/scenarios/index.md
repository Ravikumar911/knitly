# qa/scenarios/index.md — Pack Index for ingest/food-delivery

**Pack**: ingest/food-delivery (see `qa/scenarios.md` for pack-style header).

This index enumerates executable scenarios. Use for orchestrator handoff, coverage commands, and autoreview citations.

## Primary Scenario Files
- `ingest/food-delivery-edges.md` — Full qa-flow for the 9 Phase 5 edges (4 committed fixture-backed edges, 2 detailed non-fixture contracts, 3 remaining fixture gaps). Frontmatter + steps with clean DB, drive via proof harness or direct, asserts on `getTransactionsWithEmails` (exact schemaUsed etc.), reads-before-writes, jsonl replays.
  - Covers: `swiggy-order-with-pdf` (PDF+BOTH deterministic), `swiggy-body-only` (EMAIL_BODY fallback), `swiggy-promotion` and `swiggy-status-update` (skipped_non_transaction via marketing signals).
  - Detailed qa contracts: `swiggy-duplicate-order` (skipped_existing) and `swiggy-scanned-pdf` (sourceQuality=scanned).
  - Gaps/placeholders: `swiggy-instamart-with-pdf` (service=INSTAMART), `swiggy-malformed-pdf` (error class), and `swiggy-encrypted-pdf` (failed+encrypted).

## Supporting Replay Data
- `ingest/replays/pdf-vs-body.jsonl` — 5 decision path examples:
  1. deterministic-pdf branch (`pipeline.ts:114`).
  2. body-fallback (`pipeline.ts:140`).
  3. marketing skip (`pipeline.ts:131` + signals).
  4. duplicate skip (`processEmails.ts:139-141`).
  5. scanned classification (`extractor.py:90` + `pipeline.ts:348`).

## Coverage Inventory (9 edges, status)
See `qa/scenarios.md` table (cross-ref to `packages/docs/roadmap/phase-5.md:15-26`).

- Covered (fixture parity + pnpm e2e:ingest green + 0 diffs in latest bundle): 1 (order-with-pdf), 3 (body-only), 4 (promotion), 5 (status-update).
- Detailed qa contracts (full flow + asserts + jsonl replays; would catch wrong schemaUsed/dataSource/skip kind/provenance per ClawSweeper): 7 (duplicate-order at food-delivery-edges.md:177), 8 (scanned-pdf at food-delivery-edges.md:189).
- Gaps (sketches; coverage command would flag): 2 (instamart-with-pdf), 6 (malformed-pdf), 9 (encrypted-pdf).

**Parity**:
- Fixture tier: uses committed `packages/e2e-tests/fixtures/imap/{name}.eml` + `{name}.expected.json` (validated by `packages/e2e-tests/scripts/fixtures-check.ts:16-55` for Message-ID + trailing \n + canonical JSON).
- Dogfood tier: real-account (see phase-5 5.5).

**Execution stub** (for verifier subagent or tsx driver):
```ts
// pseudo (executable spirit; drive via real-behavior-proof.ts or direct import)
import { clearLocalSeedData, ensureLocalDatabase, getTransactionsWithEmails, LOCAL_USER_ID, getTransactionsCount } from "@workspace/database";
// ... import tasks runEmailSync
await clearLocalSeedData();
ensureLocalDatabase();
const before = await getTransactionsCount(LOCAL_USER_ID);
// set SLASHCASH_IMAP_FIXTURE_DIR + envs; await runEmailSync({userId: LOCAL_USER_ID, ...})
const txs = await getTransactionsWithEmails(LOCAL_USER_ID, undefined, 500);
// assert on txs matching the fixture's emailId / parsedEmailId
```
See full in `food-delivery-edges.md` + `real-behavior-proof.ts:238-279` (clean + drive + read via exports only; no raw drizzle).

## Integration points
- `pnpm qa:ingest` checks this inventory, committed fixture coverage, detailed duplicate/scanned contracts, and replay JSONL shape.
- `pnpm e2e:ingest` is the real behavior proof gate for committed fixture-backed scenarios and writes `.agents/skills/ingest-proof/reports/latest/real-behavior-proof.{json,md}`.
- `.agents/skills/run-tests/SKILL.md`, `.agents/skills/autoreview`, and `.agents/skills/orchestrator` cite this scenario pack for ingest closeout and sweeps.
- `packages/docs/reference/testing.md` treats `qa/scenarios/` as the canonical positive enforcement layer for ingest edges.
- Future improvement: extend `qa:ingest` from inventory validation into direct scenario execution if the Markdown contract grows into a richer runner.

**Evidence map for qa/scenarios creation** (ClawSweeper style):
- Changed surface: `qa/` tree (new; this index + README + edges md + jsonl).
- Runtime entry point: proof harness `packages/e2e-tests/scripts/real-behavior-proof.ts:1` (and :252 runEmailSync, :267 getTransactionsWithEmails) + DB exports `packages/database/src/index.ts:22`.
- Owner boundary: Phase 5 per `agentic-coding-adoption.md:334` + `phase-5.md` (codex owner historically); qa lives at root per OpenClaw pattern.
- Caller: `.agents/skills/orchestrator` + `ingest-edge-sweep` (for gap ledgering); `pnpm e2e:ingest` (package.json root + e2e-tests).
- Callee: `pipeline.ts` decision branches, `getTransactionsWithEmails` (transactions.ts:59), fixture expected (e.g. `swiggy-body-only.expected.json:5`).
- Sibling surfaces checked: full per `AGENTS.md:118` — `pipeline.ts:114/140/342/348`, `body-fallback.ts:16`, `swiggy-body-signals.ts:29`, `processEmails.ts:139-141` (duplicate prefilter + skipped_existing), pdf-extractor* (extract-from-pdf.ts:64, pdf-extractor-schema.ts:13), `packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py:90` (scanned), `schema.py:19`, `merchants/swiggy/schema.ts:115`, `packages/e2e-tests/fixtures/imap/` (4 .eml + 4 .expected), `fixtures-check.ts`, `real-behavior-proof.ts:318`, goldens, DB queries (index.ts:22), `packages/docs/roadmap/phase-5.md:15-26`, `testing.md:38`, AGENTS.md ingest policy. (Phase 6 expansion siblings via delegated sub-hunt.)
- Tests/scenarios covering: `pnpm fixtures:check` (4/4), `pnpm e2e:ingest` (strict proof bundles with exact values + 0 diffs), pipeline.*.test.ts, architecture-smells.
- Current shipped behavior (latest bundle 2026-06-13): 4 processed/skipped observations per mode, exact matches to committed expectations, no diffs. See `real-behavior-proof.md:34` (table with schemaUsed etc.).

This creation is narrow (committed 4 + detailed duplicate/scanned contracts + clear remaining gaps; no new .eml fixtures per instructions). Verifiers run `pnpm qa:ingest` plus the proof harness, which exercises the committed fixture-backed edges and keeps contract/gap drift visible.

See `qa/README.md` for full how-to + gates note. Repo-root paths only.
