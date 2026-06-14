# qa/scenarios — Ingest/Food-Delivery Pack (Phase 5)

**Pack identity**: "ingest/food-delivery" — executable contracts for the deterministic Swiggy (food delivery + Instamart) ingest edges. Primary owner: extraction pipeline in `packages/tasks/src/extract/`.

This is the top-level entry (pack-style, modeled on OpenClaw `qa/scenarios/`). Primary scenario families live under `scenarios/ingest/`.

## Coverage for "ingest/food-delivery"
- **Primary scenarios**:
  - `qa/scenarios/ingest/food-delivery-edges.md` (this pack's core; covers the 9 edges from the phase-5 table).
- **Supporting**:
  - `qa/scenarios/ingest/replays/pdf-vs-body.jsonl` (decision boundaries in `pipeline.ts`).
  - Future: instamart-specific, error-class-*.md, duplicate-handling.md (placeholders today).

**Parity tiers** (fixture vs dogfood):
- Fixture: committed `.eml` + `.expected.json` in `packages/e2e-tests/fixtures/imap/` + roundtrip via `pnpm e2e:ingest` (writes `.agents/skills/ingest-proof/reports/latest/real-behavior-proof.{json,md}` with exact `actual` fields).
- Dogfood: real IMAP + app-password + `packages/e2e-tests/scripts/dogfood-diff.ts` (maintainer-only; appends note to `packages/docs/current-state.md`).

**Runtime entry points for execution** (see README.md):
- Proof harness: `packages/e2e-tests/scripts/real-behavior-proof.ts:252` (runEmailSync on fixture dir) + DB reads via `packages/database` exports only.
- Direct: `import { runEmailSync } from "packages/tasks/src/trigger/processEmails.js";` + `getTransactionsWithEmails`.

## Inventory of 9 edges (from packages/docs/roadmap/phase-5.md:15-26 table)

| # | Fixture base (no .eml)         | Description (phase-5)                                      | Expected outcome (key fields)                                                                 | Status (current) | Covered by | Evidence / proof cite |
|---|--------------------------------|------------------------------------------------------------|-----------------------------------------------------------------------------------------------|------------------|------------|-----------------------|
| 1 | swiggy-order-with-pdf         | Standard food delivery order with tax-invoice PDF         | `processed`, `schemaUsed = swiggy.deterministic.v1`, exact amount, item count, order id      | covered (committed) | 4 fixtures + e2e:ingest | `packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json:9-14` (modes); latest bundle `real-behavior-proof.md:71` (dataSource=BOTH, provenance={parser:"slashcash_pdf_extractor", parsersUsed:["pdfplumber"], sourceQuality:"text", pdfAttachmentPath, warnings:["Docling is not installed."]}); `pipeline.ts:114` (deterministic branch) |
| 2 | swiggy-instamart-with-pdf     | Instamart receipt PDF                                     | `processed`, `serviceType = INSTAMART`                                                       | gap              | placeholder | phase-5.md:18; normalizeServiceType in pipeline.ts:490; no committed .eml yet |
| 3 | swiggy-body-only              | Order confirmation in body, no PDF                        | `processed`, `schemaUsed = swiggy.body.v1`                                                   | covered (committed) | 4 fixtures + e2e:ingest | `packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:5`; bundle shows dataSource=EMAIL_BODY, schemaUsed=swiggy.body.v1, amount=482.5, orderId=SWG-BODY-1002, provenance=null, warnings=0, itemNames=[] ; `pipeline.ts:140` (fallbackSwiggy) + `body-fallback.ts:16` |
| 4 | swiggy-promotion              | "20% off this weekend" promotional email                  | `skipped_non_transaction`                                                                    | covered (committed) | ... | `packages/e2e-tests/fixtures/imap/swiggy-promotion.expected.json:2`; bundle: kind=skipped_non_transaction, reason set; `pipeline.ts:131` (isSwiggyMarketingEmail) + `swiggy-body-signals.ts:29` |
| 5 | swiggy-status-update          | "Your order is on the way" status, no totals              | `skipped_non_transaction`                                                                    | covered (committed) | ... | `packages/e2e-tests/fixtures/imap/swiggy-status-update.expected.json:2`; same skip path |
| 6 | swiggy-malformed-pdf          | PDF attachment that PyMuPDF cannot open                   | `processed` via body if possible, else `failed` with classified error                        | gap              | placeholder | phase-5.md:22; error classification in extract-from-pdf + pipeline warnings/parseErrors |
| 7 | swiggy-duplicate-order        | Same Message-ID as swiggy-order-with-pdf.eml              | `skipped_existing` on second run                                                             | detailed qa contract (Phase 6) | food-delivery-edges.md:177 + replays | phase-5.md:23; processEmails.ts:139-141 (prefilter + SyncOutcome skipped_existing); would catch wrong kind/count/schema on regression |
| 8 | swiggy-scanned-pdf            | Image-only PDF (rendered, not text-backed)                | `skipped_non_transaction` with `sourceQuality.kind = "scanned"` (unless OCR=1)               | detailed qa contract (Phase 6) | food-delivery-edges.md:189 + replays | phase-5.md:24; extractor.py:90 (kind="scanned"), pipeline.ts:348 (no text source), pdf-extractor-schema.ts:13; would catch wrong sourceQuality/schemaUsed |
| 9 | swiggy-encrypted-pdf          | Password-protected PDF                                    | `failed` with `sourceQuality.kind = "encrypted"`                                             | gap              | placeholder | phase-5.md:25; encrypted error path in pdf extractor |

**Current coverage summary** (post Phase 6 handoff): 4/9 committed + fixture-proven. 2 gaps now have detailed qa-flow steps + asserts + additional jsonl (duplicate-order, scanned-pdf at food-delivery-edges.md:177/189; would catch regressions on skip kind / schemaUsed= / dataSource / provenance per AGENTS.md:113 + ClawSweeper). 3 remain sketches. See index + food-delivery-edges.md coverage note.

**Cross-refs**:
- Full table + acceptance: `packages/docs/roadmap/phase-5.md:15-26` + verification commands (incl. pnpm fixtures:check, pnpm e2e:ingest).
- Sibling surfaces (mandatory for any ingest change per `AGENTS.md:118`): `packages/tasks/src/extract/pipeline.ts:114/140/342/348` (deterministic/build/sourceQuality), `body-fallback.ts:16`, `swiggy-body-signals.ts:29`, `processEmails.ts:139-141` (duplicate-order skip), `swiggy-deterministic.ts:1`, `extract-from-pdf.ts:64`, `pdf-extractor-schema.ts:13`, `packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py:90` (scanned set) + `schema.py:19`, merchants/swiggy (schema.ts:115), goldens, all 4 committed .eml + .expected.json, `packages/e2e-tests/scripts/fixtures-check.ts`, `real-behavior-proof.ts:238/318`, DB exports (index.ts:22). Phase 6: food-delivery-edges.md detailed contracts + new jsonl replays for dup/scanned branches.
- Proof harness bundle format (latest fields): `.agents/skills/ingest-proof/reports/latest/real-behavior-proof.json` (metadata.notes cite pipeline + DB helpers; results[].fixtures[].actual has schemaUsed/dataSource/provenance/amount/orderId/itemNames/warnings/reason/kind).
- DB entry: `packages/database/src/index.ts:22` (`export * from "./queries/transactions";` exposing `getTransactionsWithEmails` at `packages/database/src/queries/transactions.ts:59`), `clearLocalSeedData`/`ensureLocalDatabase` from seed/local (index:34-38), `LOCAL_USER_ID`.
- Evidence map for this qa creation (see `qa/scenarios/ingest/food-delivery-edges.md` and final report).

**How coverage is observed**: Until a dedicated reporter, manually diff committed fixtures (via `readdir` in proof + fixtures-check) vs this inventory + phase-5 table. Orchestrator/ingest-edge-sweep already ledger "noop_gap" for missing (e.g. instamart). When `qa:ingest` lands, it will surface gaps.

Scenarios are living: any fixture addition or pipeline decision change requires updating the relevant md + jsonl + expected (and running proof + autoreview).

See `qa/README.md` for run instructions + OpenClaw ties. All citations repo-root relative.
