---
name: food-delivery-edges
pack: ingest/food-delivery
description: "Living qa contracts for the 9 Phase 5 Swiggy ingest edges (food-delivery + Instamart). Frontmatter + qa-flow style. Primary for deterministic pipeline regression + coverage."
phase5_table_rows: [1,2,3,4,5,6,7,8,9]
status: "shipped (4 committed covered, 2 detailed non-fixture contracts, 3 fixture gaps)"
last_verified_bundle: ".agents/skills/ingest-proof/reports/latest/real-behavior-proof.{json,md}"
crossrefs:
  - packages/docs/roadmap/phase-5.md:15-26
  - packages/e2e-tests/scripts/real-behavior-proof.ts:238 (clear), :252 (drive), :267 (getTransactionsWithEmails)
  - packages/database/src/index.ts:22
  - packages/tasks/src/extract/pipeline.ts:114 (deterministic), :140 (body fallback)
  - packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:5
  - AGENTS.md:113,118
  - .agents/skills/ingest-proof/SKILL.md
---

# food-delivery-edges (ingest/food-delivery pack)

**Purpose**: Executable contracts turning the phase-5.md table into living contracts (per agentic-coding-adoption.md:341). Used by verifier/orchestrator/autoreview to prove behavior on clean state, assert exact fields from the pipeline + DB writes, and flag coverage gaps.

**Parity**: Fixture tier (committed .eml + proof harness + expected.json roundtrips). Dogfood tier (real Gmail + dogfood-diff.ts + note in current-state.md).

**How driven** (executable in spirit; main/verifier subagent or tsx):
1. Clean DB state via DB exports only (no raw Drizzle).
2. Drive on specific .eml via proof harness (`pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --strict --mode pdf-enabled --fixture <name>`) **or** direct import of `runEmailSync` from tasks (with `SLASHCASH_IMAP_FIXTURE_DIR` + envs set).
3. Wait (sync completes synchronously in harness).
4. Read via `getTransactionsWithEmails(LOCAL_USER_ID, undefined, 500)`.
5. Assert exact matches on returned rows (by emailId/messageId linkage) + outcomes: `schemaUsed`, `dataSource`, `provenance` (structure + values), `amount`, `orderId`, `itemNames`, `warnings`, `reason`, `kind` (processed | skipped_non_transaction | skipped_existing | failed), extractionConfidence, etc.
6. Also assert reads-before-writes (before count -> after count, before reads vs post-sync writes).

**Tie to goldens/proof harness + latest bundle format**:
- Harness (`real-behavior-proof.ts`) isolates `SLASHCASH_HOME`, uses `clearLocalSeedData()` + `ensureLocalDatabase()`, calls `runEmailSync`, captures `getTransactionsWithEmails` rows + sync outcomes, builds `ActualFixture` (toActualFixture:340-356), diffs vs readExpected (from .expected.json), writes `ProofBundle` (metadata + results + summary).
- Bundle exact fields (from 2026-06-13 latest, post re-verify green):
  - metadata: generatedAt, fixtureDir, sqliteDbPath, modes, strict, python, notes (cite "Rows are written by packages/tasks/src/extract/pipeline.ts through exported @workspace/database helpers").
  - per mode: before/afterTransactionCount, syncCounts (processed/skipped_*/failed), fixtures[] with `expected` (from .expected.json), `actual` (kind, messageId, transactionId, amount, orderId, schemaUsed, dataSource, extractionConfidence, provenance, warnings[], parseErrors[], paymentMethod, description, itemNames[], attachmentStoragePath, reason).
  - For order-with-pdf (pdf-enabled): actual.provenance = { "parser": "slashcash_pdf_extractor", "parserVersion": "0.2.0", "parsersUsed": ["pdfplumber"], "sourceQuality": "text", "warnings": ["Docling is disabled by environment."], "pdfAttachmentPath": "...", "extractedAt": "..." }.
  - Summary: processedCount, skippedCount, diffCount==0 on green.
- Goldens: pdf-extractor Python tests + `packages/e2e-tests/fixtures/pdfs/swiggy-order-with-pdf.pdf` feed into deterministic path (pipeline `buildDeterministicPdfCandidate`).
- Always cite real fixture roundtrip values (not just unit tests).

**Reads-before-writes invariant** (assert in every run): get count before sync; drive; get count + rows after. No writes observed before the explicit sync step. Transaction writes only via `storeTransactionV2Input` (called from pipeline when storeTransaction).

## Scenario: committed-4 (all 4 current fixtures; exercised by pnpm e2e:ingest)

**Preconditions** (clean):
```ts
import {
  clearLocalSeedData,
  ensureLocalDatabase,
  getTransactionsWithEmails,
  getTransactionsCount,
  LOCAL_USER_ID,
} from "@workspace/database";
// ... dynamic import tasks for runEmailSync (as in proof harness)
await clearLocalSeedData();
ensureLocalDatabase();
const beforeCount = await getTransactionsCount(LOCAL_USER_ID);
// expect(beforeCount).toBe(0) or known seed baseline in some modes
```

**Drive (pdf-enabled mode, all fixtures; or per-fixture)**:
- Preferred: `pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --strict --output-dir .agents/skills/ingest-proof/reports/latest --mode pdf-enabled`
  - (or with `--fixture swiggy-body-only` etc. for narrow).
- This sets `SLASHCASH_IMAP_FIXTURE_DIR`, runs `runEmailSync({ userId: LOCAL_USER_ID, query: "...", full: true, reextract: true })`, collects outcomes + rows.
- Env: SLASHCASH_PDF_EXTRACTOR_DISABLED unset (for pdf path on order-with-pdf).

**Wait + collect**:
```ts
const afterCount = await getTransactionsCount(LOCAL_USER_ID);
const txs = (await getTransactionsWithEmails(LOCAL_USER_ID, undefined, 500)) as any[];
const rowsByEmailId = new Map(txs.flatMap((r: any) => r.emailId ? [[r.emailId, r]] : []));
// outcomes from syncResult (see proof:275)
```

**Asserts** (exact; cite bundle + expected.json; use for each fixture):

1. swiggy-body-only (body fallback path; `packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:5`; pipeline.ts:140):
```ts
const bodyRow = rowsByEmailId.get("swiggy-body-only") || /* find by parsed or message */;
expect(bodyRow).toBeTruthy();
expect(bodyRow.schemaUsed).toBe("swiggy.body.v1");
expect(bodyRow.dataSource).toBe("EMAIL_BODY");
expect(bodyRow.amount).toBe(482.5);
expect(bodyRow.referenceIds?.orderId || /* from merchantData */).toBe("SWG-BODY-1002");
// provenance from merchantData
const merchantDataBody = bodyRow.merchantData || {};
expect(merchantDataBody.provenance).toBeNull(); // or undefined in some serializations
expect((merchantDataBody.warnings || [])).toEqual([]);
// itemNames from orderItems in merchantData.transaction (empty in this fixture)
const txBody = merchantDataBody.transaction || {};
const itemsBody = Array.isArray(txBody.orderItems) ? txBody.orderItems.map((i:any)=>i?.name).filter(Boolean) : [];
expect(itemsBody).toEqual([]);
// from proof actual: paymentMethod "UPI", description "Swiggy order - Meghana Foods", extractionConfidence 0.7, kind processed via outcome
```
(See latest bundle actual for body-only: amount 482.5, orderId SWG-BODY-1002, dataSource EMAIL_BODY, schemaUsed swiggy.body.v1, warnings 0, itemNames [], provenance null.)

2. swiggy-order-with-pdf (deterministic PDF path; `packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json:9-14` (pdf-enabled mode)):
```ts
const pdfRow = ...; // "swiggy-order-with-pdf"
expect(pdfRow.schemaUsed).toBe("swiggy.deterministic.v1");
expect(pdfRow.dataSource).toBe("BOTH");
expect(pdfRow.amount).toBe(512.4);
expect(pdfRow.referenceIds?.orderId).toBe("SWG-PDF-1001");
// provenance structure (exact keys/values from bundle)
const prov = (pdfRow.merchantData || {}).provenance || {};
expect(prov.parser).toBe("slashcash_pdf_extractor");
expect(prov.parserVersion).toBe("0.2.0");
expect(prov.parsersUsed).toEqual(["pdfplumber"]);
expect(prov.sourceQuality).toBe("text");
expect(prov.warnings).toContain("Docling is disabled by environment.");
expect(prov.pdfAttachmentPath).toMatch(/attachments.*\.pdf$/);
// warnings surface at row + merchantData level
expect((pdfRow.merchantData?.warnings || [])).toContain("Docling is disabled by environment.");
// attachmentStoragePath on email/row
expect(pdfRow.attachmentStoragePath).toBeTruthy(); // array with path in actual
```
(See bundle: dataSource BOTH, warnings len=1, provenance as above, attachmentStoragePath array.)

3+4. swiggy-promotion and swiggy-status-update (marketing/status skip; no tx row; `...-promotion.expected.json:2`, status same):
```ts
const promoOutcome = /* from sync outcomes by messageId */;
expect(promoOutcome.kind).toBe("skipped_non_transaction");
expect(promoOutcome.reason).toBeTruthy(); // e.g. "No completed Swiggy transaction was found." or marketing path
// No row in txs for it (or row with null amount/schema if any; but typically skipped before write)
const promoRow = rowsByEmailId.get("swiggy-promotion");
expect(promoRow?.amount ?? null).toBeNull();
expect(promoRow?.schemaUsed ?? null).toBeNull();
// Same for status-update
```
In bundle actual for skips: kind=skipped_non_transaction, amount=null, schemaUsed=null, reason=..., transactionId=null. Matches expected.

**Post-assert (reads-before-writes + counts)**:
```ts
expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 2); // at least the 2 processed
// In pdf-enabled: syncCounts = {processed:2, skipped_non_transaction:2, ...}
```

**jsonl replay example** (see `replays/pdf-vs-body.jsonl` for full; cite here for decision paths exercised above):
```json
{"replayId":"pdf-vs-body-1","path":"packages/tasks/src/extract/pipeline.ts:114","decision":"deterministic-pdf","fixture":"swiggy-order-with-pdf","schemaUsed":"swiggy.deterministic.v1","dataSource":"BOTH","sourceQuality":"text"}
{"replayId":"pdf-vs-body-2","path":"packages/tasks/src/extract/pipeline.ts:140","decision":"fallback","fixture":"swiggy-body-only","schemaUsed":"swiggy.body.v1","dataSource":"EMAIL_BODY"}
{"replayId":"pdf-vs-body-3","path":"packages/tasks/src/extract/pipeline.ts:131","decision":"marketing","fixture":"swiggy-promotion","skipped":"non_transaction","via":"isSwiggyMarketingEmail"}
{"replayId":"duplicate-skip-004","path":"packages/tasks/src/trigger/processEmails.ts:140","decision":"duplicate-skip","fixture":"swiggy-duplicate-order","kind":"skipped_existing","notes":"prefilter using getProcessedEmailIds before any pipeline call; reextract:true at :131 bypasses (used in proof harness); SyncOutcome union at :61; would catch regression in duplicate handling (wrong kind or extra tx write). See also packages/tasks/src/trigger/duplicateDetector.ts and DB getProcessedEmailIds export."}
{"replayId":"scanned-error-class-005","path":"packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py:90","decision":"scanned-classification","fixture":"swiggy-scanned-pdf (future)","sourceQuality":"scanned","notes":"if (!probe.has_text): kind='scanned' (probe at :148, is_encrypted at :126); then buildDeterministicPdfCandidate at pipeline.ts:348 requires kind==='text' (else null at :352, no deterministic.v1 / BOTH); provenance from extract-from-pdf.ts:64 + schema at pdf-extractor-schema.ts:13; catches wrong schemaUsed/dataSource on scanned regression. Ties to swiggy-deterministic.ts:5 type."}
```

**Expected bundle outcome on green**: diffCount=0 across 8 observations (2 modes x 4), processed=4 total, skipped=4 total. Exact values as in latest `real-behavior-proof.md:34` table and per-fixture ```json blocks.

## Non-fixture contracts and remaining fixture gaps

These have no committed `.eml` + `.expected.json` yet (per "narrow: ... no new fixtures unless minimal"). Duplicate-order and scanned-pdf now have detailed qa-flow contracts and replay rows; Instamart, malformed PDF, and encrypted PDF remain fixture gaps. When fixtures land (e.g. via ingest-edge-sweep or dogfood), replace sketches with real asserts + add to inventory + update expected.json + rerun proof.

**Placeholder: swiggy-instamart-with-pdf** (phase-5.md:18)
- Drive: (future .eml with Instamart PDF).
- Asserts (sketch):
  ```ts
  const instamartRow = ...;
  expect(instamartRow.schemaUsed).toBe("swiggy.deterministic.v1"); // or body
  expect(instamartRow.dataSource).toBe("BOTH");
  // service via swiggyMetadata.service or merchantData
  const meta = (instamartRow.merchantData || {}).swiggyMetadata || {};
  expect(meta.service).toBe("INSTAMART"); // from normalizeServiceType in pipeline.ts:490
  expect(instamartRow.amount).toBeGreaterThan(0); // specific when fixture exists
  ```
- Coverage note: gap. Would be covered by new fixture + expected + pnpm e2e:ingest + fixtures:check. No current .eml in `packages/e2e-tests/fixtures/imap/`.

**Placeholder: swiggy-malformed-pdf** (phase-5.md:22)
- Drive on .eml with unopenable PDF.
- Asserts:
  ```ts
  const malOutcome = ...; const malRow = ...;
  // either falls back to body (processed + body schema) or
  expect(malOutcome.kind).toBe("failed"); // or processed
  expect(malRow?.merchantData?.parseErrors?.[0] || malOutcome.error).toMatch(/malformed|PyMuPDF|cannot open/i);
  ```
- Gap.

**Scenario: duplicate-order** (detailed qa-flow contract for phase-5.md:23; same Message-ID as swiggy-order-with-pdf; exercises prefilter skip before pipeline)
**Preconditions** (clean state, DB exports only per packages/database/src/index.ts:34):
```ts
import { clearLocalSeedData, ensureLocalDatabase, getTransactionsWithEmails, getTransactionsCount, LOCAL_USER_ID } from "@workspace/database";
// ... dynamic import for runEmailSync from tasks
await clearLocalSeedData();
ensureLocalDatabase();
const beforeCount = await getTransactionsCount(LOCAL_USER_ID);
```
**Drive** (via proof harness or direct; note reextract bypass):
- First: `pnpm exec tsx packages/e2e-tests/scripts/real-behavior-proof.ts --strict --mode pdf-enabled --fixture swiggy-order-with-pdf` (or equiv with reextract:true at packages/tasks/src/trigger/processEmails.ts:131) → processes (kind=processed, schemaUsed written via pipeline.ts:290 + storeTransactionV2Input).
- Second (same Message-ID): re-run sync WITHOUT reextract (or direct call exercising the getProcessedEmailIds prefilter at processEmails.ts:134-140) → hits skip path.
**Wait + collect**:
```ts
const afterFirst = await getTransactionsCount(LOCAL_USER_ID);
const outcomes = ...; // from syncResult
const rows = await getTransactionsWithEmails(LOCAL_USER_ID, undefined, 500);
const dupOutcome = outcomesByMessageId.get("swiggy-duplicate-order");
const dupRow = rowsByEmailId.get("swiggy-duplicate-order");
```
**Asserts** (exact; would catch regression e.g. wrong skip kind or extra write or wrong provenance on tx):
```ts
expect(dupOutcome.kind).toBe("skipped_existing");  // SyncOutcome at processEmails.ts:61
expect(dupOutcome.reason || "").toMatch(/existing|duplicate|already/i);
expect(afterCount).toBe(afterFirst);  // no tx count increase for duplicate Message-ID
// if row exists for it (e.g. from first), no re-write of schemaUsed/dataSource
if (dupRow) {
  expect(dupRow.schemaUsed).toBe("swiggy.deterministic.v1"); // or whatever first wrote; no change
  expect(dupRow.dataSource).toBe("BOTH");
}
```
**Post + reads-before-writes**: counts stable on second drive; writes only via exported DB helpers (no raw in processEmails).
**Regression guard**: scenarios would fail on kind!=skipped_existing or count increase if duplicate prefilter at packages/tasks/src/trigger/processEmails.ts:139 removed/broken (see also duplicateDetector.ts).

**Scenario: scanned-pdf** (detailed qa-flow contract for phase-5.md:24; image-only PDF; exercises sourceQuality + no-deterministic path)
**Preconditions** (clean; same DB exports + count before).
**Drive** (when committed .eml + scanned PDF lands; current committed proof exercises text path):
- Drive .eml + image-only PDF via proof harness (pdf-enabled mode).
- (Current fixtures use text-backed; scanned would be detected in python extractor before node pipeline.)
**Wait + collect** (outcomes + rows + merchantData.provenance):
**Asserts** (exact shape from proof toActual + bundle; would catch wrong classification or schemaUsed):
```ts
const scannedOutcome = ...;
const scannedRow = ...;
const prov = (scannedRow?.merchantData || {}).provenance || {};
const srcQ = prov.sourceQuality || (scannedRow as any).sourceQuality || "";
// scanned path: no text source taken in buildDeterministic at pipeline.ts:348
expect(scannedOutcome.kind).toBe("skipped_non_transaction"); // or processed via fallback if body signals
// key: sourceQuality classification from python
expect(srcQ).toBe("scanned");  // or assert !deterministic taken (schemaUsed != "swiggy.deterministic.v1" or dataSource != "BOTH")
expect(scannedRow?.schemaUsed ?? null).not.toBe("swiggy.deterministic.v1"); // regression would wrongly pick text path
// provenance populated from extract-from-pdf.ts:64 + pdf-extractor-schema.ts:13
```
**Regression guard**: would catch if python sets wrong kind (extractor.py:90) or build ignores non-text (pipeline.ts:352) or provenance shape changes → wrong schemaUsed/dataSource/provenance in actual vs expected.
**Post**: reads-before-writes; tie to goldens in packages/pdf-extractor/tests/ for parity.

**Sibling analysis for duplicate/scanned expansion** (ClawSweeper per AGENTS.md:118 + adoption:24; full deterministic pipeline cited repo-root:lines; subagent hunts via parallel greps/reads):
- Entry/owner: real-behavior-proof.ts:238 (clear+drive), 258 (runEmailSync), 267 (getTx), 318 (toActual); processEmails.ts:131 (reextract), :139 (prefilter), :140 (push skipped_existing); pipeline.ts:42 (extract fn), 114 (deterministic), 140 (fallback), 290 (store), 342 (build fn), 348 (text sourceQuality check), 352 (return null).
- Siblings checked: body-fallback.ts:16 (full), swiggy-body-signals.ts:29 (marketing), swiggy-deterministic.ts:1 (ExtractionProvenance incl scanned), extract-from-pdf.ts:64 (sourceQuality log), pdf-extractor.ts:41 (disabled), pdf-extractor-schema.ts:13 (SourceQuality enum), merchants/swiggy/schema.ts:115 (service enum) + index.ts:5 (SwiggyMerchant), python extractor.py:83 (encrypted), :89-90 (scanned: source_quality.kind = "scanned"; probe:126 is_encrypted, :148 has_text), schema.py:19 (Literal kinds), fixtures (order-with-pdf.expected.json:9 for contrast), goldens, DB exports (index.ts:22 get*/clear), proof harness (real-behavior-proof.ts:359 diff, bundle latest), fixtures-check.ts, phase-5.md:23-24, AGENTS.md:118, prior proof reports.
- Callees/callers: SyncOutcome type (processEmails:61), build at pipeline:348 feeding provenance:431, DB store only via exports.
- Current shipped: 0 diffs on text path (bundle md:34); scanned/dup would exercise skip branches without new fixtures.
- Best-fix: narrow qa edits to existing placeholders (no new files/fixtures per guardrails); directly adds detailed flows + regression asserts + jsonl per query.
- Reads-before-writes + real proof: harness drives via exports only; bundle provides exact values for committed contrast.

(Updated coverage + crossrefs below; full list now includes processEmails.ts:139-141, extractor.py:90.)

**Placeholder: swiggy-encrypted-pdf** (phase-5.md:25)
- Drive .eml + password PDF.
- Asserts:
  ```ts
  const encOutcome = ...;
  expect(encOutcome.kind).toBe("failed");
  const prov = ...;
  expect((prov.sourceQuality || prov.error || encOutcome.error)).toMatch(/encrypted|password/i);
  ```
- Gap.

**Coverage note**: A `qa-coverage` or extended `fixtures:check` (future) would:
- List phase-5 table 9.
- Glob committed fixtures in `packages/e2e-tests/fixtures/imap/`.
- Mark status covered/gap.
- Flag the 3 remaining fixture gaps, the 2 detailed non-fixture contracts, and any drift in committed 4.
Current (post Phase 6 handoff): 4 covered (fixture parity + pnpm e2e:ingest + 0 diffs); duplicate-order + scanned-pdf now have *detailed qa-flow + asserts + jsonl* (scenarios would catch regressed skip kind / schemaUsed / dataSource / provenance); 3 gaps remain sketches (instamart/malformed/encrypted). See updated `qa/scenarios/index.md` + `qa/scenarios.md`. Orchestrator/ingest-edge-sweep ledger gaps.

## Sample assert snippet (reusable pattern for all)
```ts
// after drive + collect txs/rows/outcomes for a fixture
const actualKind = outcome.kind;
const actualSchema = row?.schemaUsed ?? null;
const actualDataSource = row?.dataSource ?? null;
const actualAmount = row?.amount ?? null;
const actualOrderId = ...; // from referenceIds or merchantData
const actualProv = (row?.merchantData || {}).provenance ?? null;
const actualWarnings = Array.isArray((row?.merchantData||{}).warnings) ? ... : [];
const actualItems = ...; // map orderItems names
const actualReason = outcome.reason ?? null;

expect(actualKind).toBe(expected.kind);
if (expected.schemaUsed) expect(actualSchema).toBe(expected.schemaUsed);
// ... similarly for dataSource, amount (with epsilon for float), orderId, etc.
if (expectedProvenanceShape) expect(actualProv).toMatchObject(...);
// always: expect(diffsFromBundle).toEqual([]) when using proof harness
```
See `real-behavior-proof.ts:359` (diffExpected) + `toActualFixture:318` for canonical actual shape. Use this pattern in future qa driver.

## Later updates (see qa/README.md + phase-5.md)
- Add real .eml + update non-fixture contracts/sketches when gaps close (must also update goldens/fixtures + rerun full proof + autoreview).
- Integrate coverage reporter.
- Crossref updates in `packages/docs/reference/testing.md:38`, `phase-5.md` (files touched), e2e scenarios, architecture-smells.
- Verifier: run `pnpm qa:ingest` plus `pnpm e2e:ingest` (covers committed), inspect latest bundle vs the asserts above, and keep non-fixture contracts/gaps visible. Cite real values from bundle (e.g. 482.5, SWG-BODY-1002, BOTH, "slashcash_pdf_extractor").
- Expand for new edges from sweeps/dogfood.

**Sibling analysis for this doc creation + Phase 6 expansion** (ClawSweeper AGENTS.md:118 + adoption plan:24; explicit full pipeline read before verdict; subagent parallel hunts for dup/scanned): pipeline.ts:42/114 (deterministic), :131 (marketing), :140 (fallback), :290 (store), :342/348/352 (build + text sourceQuality + return null), :431 (provenance); body-fallback.ts:16; swiggy-body-signals.ts:29; processEmails.ts:131 (reextract), :139-141 (getProcessed + skipped_existing push), :390 (counts); swiggy-deterministic.ts:1 (sourceQuality type); extract-from-pdf.ts:64; pdf-extractor.ts:41; pdf-extractor-schema.ts:13; merchants/swiggy/schema.ts:115 (INSTAMART etc) + index.ts:5; python extractor.py:83/89-90 (encrypted/scanned set; probe :126/:148), schema.py:19; real-behavior-proof.ts:238/258/267/318/359; DB index.ts:22/34 (exports only); fixtures (order-with-pdf.expected.json:9 etc); goldens; fixtures-check.ts; proof bundle .agents/skills/ingest-proof/reports/latest/real-behavior-proof.md:34 (exact 0-diff values); phase-5.md:15-26; adoption:408/450; AGENTS:118; prior reports. No raw queries; narrow (qa contracts only). Evidence map in final report.

All values from real committed fixture proof roundtrips (0 diffs on latest green run; see bundle for schemaUsed=swiggy.deterministic.v1 / swiggy.body.v1, dataSource=BOTH/EMAIL_BODY, provenance parser=slashcash_pdf_extractor + sourceQuality=text + warnings, amounts 512.4/482.5, orderIds SWG-PDF-1001/SWG-BODY-1002). Phase 6 subagent ID: 019ebff7-qa-main-001 (delegated sib-hunts via parallel tools + orchestrator --worker).
