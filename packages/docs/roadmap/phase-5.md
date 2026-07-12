# Phase 5 — End-to-end proof, fixtures, dogfood, cleanup

> _Phase 5 of 5 in the Swiggy ingest pivot. Depends on phases 1–4. Read [`pdf-extractor.md`](./pdf-extractor.md) first._ > _Status: Shipped. Owner: codex._

## Goal

Prove the deterministic, parallel, AI-free Swiggy ingest works end-to-end on both fixtures and a real Gmail account; lock the regressions out with tests; and remove the obsolete compatibility surface so the codebase reflects the new model.

## Work items

### 5.1 Richer `.eml` fixtures

Expand `packages/e2e-tests/fixtures/imap/` to cover the messy reality of a real Swiggy mailbox. Each fixture lives as a single `.eml` file with a stable `Message-ID` header and a sibling JSON file that describes the **expected outcome**.

| Fixture                         | Description                                                  | Expected outcome                                                                                         |
| ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `swiggy-order-with-pdf.eml`     | Standard food delivery order with a tax-invoice PDF attached | `processed`, `schemaUsed = swiggy.deterministic.v1`, exact amount, item count, order id                  |
| `swiggy-instamart-with-pdf.eml` | Instamart receipt PDF                                        | `processed`, `serviceType = INSTAMART`                                                                   |
| `swiggy-body-only.eml`          | Order confirmation in body, no PDF                           | `processed`, `schemaUsed = swiggy.body.v1`                                                               |
| `swiggy-promotion.eml`          | "20% off this weekend" promotional email                     | `skipped_non_transaction`                                                                                |
| `swiggy-status-update.eml`      | "Your order is on the way" status, no totals                 | `skipped_non_transaction`                                                                                |
| `swiggy-malformed-pdf.eml`      | PDF attachment that PyMuPDF cannot open                      | `processed` via body if possible, else `failed` with classified error                                    |
| `swiggy-duplicate-order.eml`    | Same `Message-ID` as `swiggy-order-with-pdf.eml`             | `skipped_existing` on second run                                                                         |
| `swiggy-scanned-pdf.eml`        | Image-only PDF (rendered, not text-backed)                   | `skipped_non_transaction` with `sourceQuality.kind = "scanned"` (unless `SLASHCASH_PDF_EXTRACTOR_OCR=1`) |
| `swiggy-encrypted-pdf.eml`      | Password-protected PDF                                       | `failed` with `sourceQuality.kind = "encrypted"`                                                         |

Each `.eml` references PDFs that live under `packages/e2e-tests/fixtures/pdfs/`. The fixtures must round-trip through `pnpm fixtures:check`.

### 5.2 Python golden tests

Add `packages/pdf-extractor/tests/test_swiggy_golden.py`:

- For each PDF fixture, hand-author an expected JSON output (just the `fields` block).
- Run the extractor, compare the produced `fields` to the golden JSON with strict equality on numeric and string fields, and `>=` on item counts (to allow extra warnings to land without breaking the test).
- Goldens live next to the fixtures: `packages/pdf-extractor/tests/fixtures/<name>.expected.json`.
- Update `python -m unittest` invocation to discover this file.

### 5.3 Node integration test

Add `packages/tasks/src/extract/pipeline.integration.test.ts` (gated by `VITEST_INTEGRATION=1`):

- Spawns the real Python extractor against `packages/pdf-extractor/tests/fixtures/swiggy-sample.pdf`.
- Runs the full `extractTransactionFromEmail` pipeline.
- Asserts the resulting object matches the golden JSON for that fixture, plus the SQLite-side fields (`schemaUsed`, `dataSource`, `provenance`).
- Skips cleanly on CI nodes without Python 3.11+.

### 5.4 E2E ingest scenario refresh

Update `packages/e2e-tests/scenarios/phase-2.ts` (still aliased as `e2e:ingest` per Phase 0 of the IMAP pivot) to drive **all** the new fixtures, not just one. Assert the outcome JSON matches the per-fixture expected outcomes. Cover both `SLASHCASH_PDF_EXTRACTOR_DISABLED=1` and unset.

Add `packages/e2e-tests/scenarios/onboarding-fast-path.ts`, runnable as `pnpm e2e:onboarding`:

- Starts from a clean `~/.slashcash`.
- Runs `slashcash onboard --yes` and asserts wall time < 30s with no model pull.
- Asserts the dashboard responds on `/api/healthz` immediately.
- Asserts `slashcash status` shows a background sync running.
- Asserts the assistant tab returns the "no provider configured" structured error.

### 5.5 Real Gmail dogfood

On a maintainer machine with a real Gmail account, real app password, real Python venv, and a one-year history of Swiggy orders:

1. Run `slashcash onboard --yes`.
2. Wait for background sync to complete.
3. Run a verification script (`packages/e2e-tests/scripts/dogfood-diff.ts`) that picks 20 random `transactions_v2` rows and prints them next to the corresponding Gmail message + PDF for manual diffing.
4. Hand-diff each row on these fields: amount, paid amount, order id, invoice number, invoice date, restaurant, item count.
5. File any delta as a parser bug under `packages/pdf-extractor/`.

The dogfood result is captured as a one-paragraph note appended to [`../current-state.md`](../current-state.md) — when the dogfood passes, the v1 release is unblocked.

### 5.6 Cleanup of obsolete surface

After the above passes:

- Delete the deprecated `e2e:phase-1` … `e2e:phase-5` aliases in `packages/e2e-tests/package.json` and the root `package.json`. Keep only the named gates: `e2e:ingest`, `e2e:cli`, `e2e:pyramid`, `e2e:release`, `e2e:onboarding`, `e2e:all`.
- Delete `packages/evals/src/swiggy-extraction.eval.ts` and its scorer. The eval surface is reserved for assistant-side evals only.
- Remove `OLLAMA_*` from `packages/tasks/.env.example` (assistant config moves to `apps/main/.env.example` if needed).
- Update `packages/tasks/README.md`, `apps/main/AGENTS.md`, and `AGENTS.md` so no doc claims AI-backed ingest.
- Sweep `packages/docs/` for stale references to `swiggy.sources.v1`, "single Gemma source extraction", "OCRModel", "ATTACHMENT HANDLING", and "slashAIV2" outside historical sections.

### 5.7 Architecture smell additions

Tighten `packages/e2e-tests/architecture-smells.test.ts`:

- Forbid `import * from "ai"` and `@ai-sdk/*` outside `apps/main/lib/ai/` and `apps/main/app/api/assistant/`.
- Forbid `child_process.spawn("python", ...)` outside `packages/tasks/src/extract/pdf-extractor.ts` and `packages/cli/src/python/`.
- Forbid the strings `slashAIV2`, `transactionsEnhanced`, `OCRModel`, `ATTACHMENT HANDLING` outside `packages/docs/`.
- Ensure `transactions_v2.schemaUsed` only takes the three documented values in shipping code.

## Files touched (expected)

- `packages/e2e-tests/fixtures/imap/*.eml` (new)
- `packages/e2e-tests/fixtures/pdfs/*.pdf` (new, small)
- `packages/e2e-tests/scenarios/phase-2.ts`
- `packages/e2e-tests/scenarios/onboarding-fast-path.ts` (new)
- `packages/e2e-tests/scripts/dogfood-diff.ts` (new)
- `packages/e2e-tests/architecture-smells.test.ts`
- `packages/pdf-extractor/tests/test_swiggy_golden.py` (new)
- `packages/pdf-extractor/tests/fixtures/*.expected.json` (new)
- `packages/tasks/src/extract/pipeline.integration.test.ts` (new)
- `packages/tasks/README.md`
- `packages/evals/src/*` (delete Swiggy ingest evals)
- `packages/tasks/.env.example`
- `packages/docs/current-state.md`
- `packages/docs/architecture.md`
- `packages/docs/reference/testing.md`
- `packages/docs/reference/cli.md`
- `packages/docs/reference/env-vars.md`
- `package.json` and `packages/e2e-tests/package.json`

## Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm fixtures:check
pnpm architecture-smells

PYTHONPATH=packages/pdf-extractor/src python -m unittest discover -s packages/pdf-extractor/tests -v

VITEST_INTEGRATION=1 pnpm --filter @workspace/tasks test --run pipeline.integration

pnpm e2e:ingest
pnpm e2e:onboarding
pnpm e2e:all
pnpm bench   # 1-year synthetic mailbox

# Dogfood (maintainer-only, real account)
pnpm dlx tsx packages/e2e-tests/scripts/dogfood-diff.ts
```

## Acceptance

- All commands above pass on CI for fixture-driven runs.
- The maintainer dogfood note in `current-state.md` documents at least 20 hand-diffed transactions across food delivery + Instamart with zero amount mismatches and ≥ 95% item-count accuracy. Any miss is filed as a parser bug.
- `rg "slashAIV2|transactionsEnhanced|OCRModel|swiggy\\.sources\\.v1"` over the repo returns hits only inside `packages/docs/` (history) or release-notes.
- The phase aliases (`e2e:phase-*`) no longer exist in any `package.json`.
- The bench harness reports a `< 20s` 1-year sync (Phase 3's hard target) on the maintainer machine.

## Exit criteria for the whole pivot

When this phase signs off, the following must all be true. Do not declare the pivot done if any are still red:

1. A clean macOS machine: Download for Mac (Desktop app) → Desktop onboarding (Gmail + app password only) → dashboard opens → background sync populates Swiggy transactions, with **no** model pull anywhere in the path.
2. `pnpm test`, `pnpm e2e:ingest`, `pnpm e2e:onboarding`, `pnpm architecture-smells`, `pnpm fixtures:check`, `pnpm bench`, and the Python golden suite all pass on CI.
3. Real-account dogfood note is published in `current-state.md`.
4. No remaining references to `slashAIV2`, `transactionsEnhanced`, `OCRModel`, `swiggy.sources.v1`, or "single Gemma source extraction" outside historical doc sections.
5. The assistant tab can be configured by Local Ollama (Gemma), OpenAI-compatible API key, or Anthropic from a fresh dashboard, independently of ingest.

## Out of scope

- Multi-merchant support (banks, Phonepe, etc.). The deterministic-extractor pattern is generalizable, but generalizing it is its own roadmap.
- Cross-device sync, hosted backups, or any non-local persistence.
- Replacing `better-sqlite3`, switching ORMs, or restructuring the monorepo.
