# Phase 2 — Remove AI from ingestion

> _Phase 2 of 5 in the Swiggy ingest pivot. Depends on [`phase-1.md`](./phase-1.md). Read [`pdf-extractor.md`](./pdf-extractor.md) first._ > _Status: Shipped. Owner: codex._

## Goal

Swiggy ingest writes correct rows **without invoking any chat model**. The current `extractFromEmailSources()` path that calls Gemma over Ollama is removed from the persisted pipeline. Gemma is reserved for the dashboard assistant only.

After this phase:

- `SLASHCASH_SYNC_SKIP_AI=1` is no longer a special "skip AI" mode — it is the default behavior.
- Ingest never blocks on `OLLAMA_BASE_URL` being reachable.
- The assistant route (`apps/main/app/api/assistant/route.ts`) is the only place that consumes a chat provider.

## Why

Generative models hallucinate amounts, item counts, and order ids. For Swiggy, both the email body and the PDF carry the exact values; deterministic parsing is more accurate, faster, and free of provider dependencies. AI has a real role in the assistant — natural-language queries over already-correct data — but not in ingest.

## Work items

### 2.1 Make deterministic extraction the only persisted path

In `packages/tasks/src/extract/pipeline.ts`:

- Remove the branch that calls `extractFromEmailSources(emailData, model, …)` and writes its output to `transactions_v2`.
- Keep the model-free flow:
  1. Run the Python extractor (PDF + body in one subprocess, per Phase 1).
  2. Validate via `swiggy-deterministic.ts`.
  3. If neither PDF nor body yielded a transaction, fall back to `body-fallback.ts` (regex-only, no model).
  4. If the fallback also fails, classify the email as a non-transaction.
- The `model = defaultModel()` call must move out of `pipeline.ts` entirely. Pipeline must not import `defaultModel`.

### 2.2 Optional experimental flag (developer-only)

If a future agent wants to A/B compare model output against deterministic output without re-introducing it to production:

- Gate the old path behind `SLASHCASH_EXPERIMENTAL_AI_INGEST=1`.
- When set, run **both** extractors, store the deterministic row, and emit the model row to a new `extraction_audit` table or to a structured log line. Never overwrite the persisted transaction.
- The flag is off by default and explicitly not documented in the user-facing CLI/help.

If you choose **not** to keep the comparison path, delete `extract-from-email-body.ts` and the `defaultModel` factory used by ingest (keep the assistant provider in `apps/main/lib/ai/provider.ts` untouched).

### 2.3 Schema label cleanup

`transactions_v2.schemaUsed` currently has four values: `swiggy.deterministic.v1`, `swiggy.body.v1`, `swiggy.sources.v1`, `swiggy.fallback.v1`.

After this phase, only three are valid for new rows:

- `swiggy.deterministic.v1` — Python extractor + body merge succeeded.
- `swiggy.body.v1` — Python extractor unavailable (e.g. `SLASHCASH_PDF_EXTRACTOR_DISABLED=1` or scanned PDF) and body parsing succeeded.
- `swiggy.fallback.v1` — body regex fallback only.

`swiggy.sources.v1` is retired. Existing rows are not migrated; the analytics queries treat them as deterministic-equivalent.

### 2.4 Non-transactional email handling

Promotions, status emails, and refunds-only messages must not throw `Could not extract transaction data from the Gmail message.` and must not increment `errorCount`.

In `packages/tasks/src/trigger/processEmails.ts`:

- Replace the unconditional `throw` after `if (!extracted.parseSuccess)` with a classified outcome:
  - `processed` — transaction stored.
  - `skipped_existing` — `isEmailProcessed` returned true.
  - `skipped_non_transaction` — Python explicitly said "no Swiggy transaction here" (newsletter, status update, scanned PDF without OCR enabled, etc.).
  - `failed` — IMAP error, parser crash, malformed JSON, etc.
- `parseSuccess` on `parsed_emails` stays `false` only for `failed`; `skipped_non_transaction` should set `parseSuccess = true` with `parseErrors = null`.

### 2.5 Provenance on `merchantData`

Every persisted row must carry parser provenance so we can audit later:

```ts
merchantData: {
  ...extractionData,
  provenance: {
    parser: "slashcash_pdf_extractor",
    parserVersion: "<x.y.z>",
    parsersUsed: ["docling", "pdfplumber"],
    sourceQuality: "text" | "scanned" | "empty" | "encrypted" | "corrupted",
    warnings: [...],
    pdfAttachmentPath: "<absolute path or null>",
    extractedAt: "<ISO timestamp>",
  },
}
```

Add a `getTransactionProvenance(transactionId)` query helper in `@workspace/database` so the dashboard can surface this on a transaction detail panel later.

### 2.6 Evals scoping

`packages/evals/` currently scores Swiggy AI extraction. After this phase:

- Move `swiggy-extraction.eval.ts` to `swiggy-extraction-legacy.eval.ts` and mark it skipped by default.
- The `pnpm eval:gate` command no longer gates Swiggy ingest — it is reserved for assistant-side evals (chat tool calls, tool-use accuracy, summarization).
- Remove `eval:gate` from the Phase 5 release acceptance for ingest. Keep it as an assistant gate when the assistant gets a real eval suite.

### 2.7 Assistant separation

Confirm the boundary stays clean:

- `apps/main/app/api/assistant/route.ts` is allowed to import `@ai-sdk/openai-compatible`, `ai`, and chat configuration from `apps/main/lib/ai/provider.ts`.
- `packages/tasks/**` must not import any chat model after this phase. Add an architecture-smell rule:
  ```
  packages/tasks/src/**/*.ts must not import from "ai", "@ai-sdk/*", or "../ai/model"
  ```
- Move the in-pipeline model factory away from `packages/tasks/src/ai/model.ts`. If the file becomes empty, delete it.

## Files touched (expected)

- `packages/tasks/src/extract/pipeline.ts`
- `packages/tasks/src/extract/extract-from-email-body.ts` (delete or guard behind experimental flag)
- `packages/tasks/src/ai/model.ts` (delete or move to assistant)
- `packages/tasks/src/trigger/processEmails.ts`
- `packages/tasks/src/extract/body-fallback.ts` (no logic change, kept for body-only path)
- `packages/database/src/queries/transactions.ts` (add `getTransactionProvenance`)
- `packages/database/src/index.ts` (export new helper)
- `packages/e2e-tests/architecture-smells.test.ts` (add forbidden-import rule)
- `packages/evals/src/swiggy-extraction.eval.ts` (rename + skip)
- `packages/evals/src/eval-gate.ts` (drop Swiggy from default gate)

## Verification commands

```bash
SLASHCASH_SYNC_SKIP_AI=1 pnpm --filter @workspace/tasks test
SLASHCASH_PDF_EXTRACTOR_DISABLED=1 pnpm --filter @workspace/tasks test
pnpm --filter @workspace/tasks test --run pipeline

pnpm architecture-smells
pnpm typecheck
pnpm lint

rg "extractFromEmailSources|defaultModel\\(" packages/tasks/src
```

## Acceptance

- All tests pass with both `SLASHCASH_SYNC_SKIP_AI=1` and the unset case (because there is no AI path anymore in either case).
- Fixture ingest writes `transactions_v2` rows with `schemaUsed = swiggy.deterministic.v1` for PDF-bearing fixtures and `swiggy.body.v1`/`swiggy.fallback.v1` for body-only fixtures.
- A Swiggy promotion fixture writes a `parsed_emails` row classified as `skipped_non_transaction`, increments the skipped counter, and **does not** count as an error.
- `rg "extractFromEmailSources|defaultModel"` over `packages/tasks/src` returns no hits.
- Architecture smells block any future import of `ai` / `@ai-sdk/*` from `packages/tasks/`.
- Assistant route in `apps/main` still streams correctly against the configured chat provider.

## Out of scope

- Parallelism (Phase 3).
- Onboarding/assistant setup UX (Phase 4).
- Adding new fixtures (Phase 5).
- Touching `apps/main/app/api/assistant/route.ts` beyond confirming it still compiles.
