# Phase 1 — Lock the deterministic Python extractor

> _Phase 1 of 5 in the Swiggy ingest pivot. Read [`pdf-extractor.md`](./pdf-extractor.md) first for the overall plan and "Completed baseline"._ > _Status: Shipped. Owner: codex._

## Goal

Python owns Swiggy PDF + body extraction and emits **exact, typed fields** with provenance. After this phase, `python -m slashcash_pdf_extractor <pdf>` is the single source of truth for invoice values; the TypeScript pipeline only validates and normalizes what Python returns.

No part of this phase calls Gemma, Ollama, OpenAI, or Claude. The ingest must produce correct Swiggy rows with `SLASHCASH_SYNC_SKIP_AI=1` set.

## Library decision (no LLMs in this lane)

| Layer                          | Library                                                                                              | Why                                                                            | Notes                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| Primary PDF conversion         | [Docling](https://github.com/DS4SD/docling)                                                          | Layout-aware markdown/text + table export; handles Swiggy invoice layout best  | Already a dependency               |
| Fast PDF probe                 | [PyMuPDF](https://pymupdf.readthedocs.io/) (`pymupdf`)                                               | Detects text-backed vs image-only, page count, encryption, empty pages quickly | New dep                            |
| Deterministic table fallback   | [pdfplumber](https://github.com/jsvine/pdfplumber)                                                   | No Java; gives char/table coordinates; works when Docling export is sparse     | New dep                            |
| OCR fallback (optional, gated) | [pytesseract](https://github.com/madmaze/pytesseract) + [OCRmyPDF](https://ocrmypdf.readthedocs.io/) | Only used for image-only PDFs; off by default                                  | Disabled until fixtures justify it |

Avoid Camelot (lattice-only), Tabula (Java runtime), EasyOCR (known `$/8` confusion on amounts), and any LLM/VLM extractor. These are explicitly out of scope.

Email-body parsing stays in Python too. Phase 1 ports the existing Swiggy body regexes from `packages/tasks/src/extract/swiggy-deterministic.ts` and `body-fallback.ts` into the Python package so PDF and body parsing share a schema.

## Work items

### 1.1 Pin new Python dependencies

- Add to `packages/pdf-extractor/requirements.txt` (with `==` exact pins and SHA256 hashes):
  - `pymupdf==<latest>`
  - `pdfplumber==<latest>`
- Add the same to `packages/pdf-extractor/pyproject.toml` `dependencies` (without hashes).
- Keep Docling as `optional-dependencies.docling`; the runtime should still degrade if Docling import fails.
- Update `~/.slashcash/py-venv` install hash logic — the doctor `python-env` repair must re-install when `requirements.txt` hash drifts.

### 1.2 Replace the byte-fallback with a real extractor chain

Rewrite `packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py`:

1. Open the PDF with PyMuPDF first. Capture: `pageCount`, `isEncrypted`, `hasText`, `firstPageImageRatio`. Use this to classify the PDF before any heavy work.
2. If text-backed:
   - Try Docling first (existing path).
   - If Docling fails or returns < N usable characters, fall back to pdfplumber for both raw text and per-page tables.
3. If image-only and `SLASHCASH_PDF_EXTRACTOR_OCR=1`:
   - Run pytesseract on each page rendered via PyMuPDF.
   - Otherwise, return `sourceQuality.kind = "scanned"` and let the Node side emit a non-transaction outcome (no fake amounts).
4. If encrypted/empty/corrupted: return a structured failure (`PdfExtractorError` with classified reason). Do not return zero amounts.

Delete the current `extract_text_from_pdf_bytes` Latin-1 fallback. It silently returns garbled text and trips downstream regexes.

### 1.3 Expand the JSON schema to typed Swiggy fields

Update `packages/pdf-extractor/src/slashcash_pdf_extractor/schema.py`:

```python
class SwiggyLineItem(BaseModel):
    name: str
    quantity: float | None
    unit_price: float | None
    amount: float | None
    discount: float | None
    net_amount: float | None
    tax_total: float | None

class SwiggyInvoiceFields(BaseModel):
    order_id: str | None
    invoice_no: str | None
    invoice_date: str | None  # ISO yyyy-mm-dd
    restaurant_name: str | None
    restaurant_address: str | None
    customer_address: str | None
    pincode: str | None
    invoice_total: float | None
    paid_amount: float | None
    item_subtotal: float | None
    tax_total: float | None
    platform_fee: float | None
    delivery_fee: float | None
    packaging_fee: float | None
    discount_total: float | None
    payment_method: str | None
    service_type: Literal["FOOD_DELIVERY", "INSTAMART", "GENIE", "DINEOUT", "UNKNOWN"]
    items: list[SwiggyLineItem]

class SourceQuality(BaseModel):
    kind: Literal["text", "scanned", "empty", "encrypted", "corrupted"]
    page_count: int
    parsers_used: list[str]   # e.g. ["docling"], ["pdfplumber"], ["docling", "pdfplumber"]
    warnings: list[str]

class PdfExtraction(BaseModel):
    schema_version: Literal["2"]
    extractor: str
    extractor_version: str
    merchant: Literal["swiggy"]
    confidence: float  # 0..1, derived from which fields landed and whether sources agreed
    fields: SwiggyInvoiceFields
    raw: PdfExtractionRaw
    source_quality: SourceQuality
```

Bump `schema_version` from `"1"` to `"2"`. Update the Python emitter (`scripts/emit_ts_schema.py`) and the Zod mirror at `packages/tasks/src/extract/pdf-extractor-schema.ts` so `pnpm architecture-smells` fails on drift.

### 1.4 Move Swiggy deterministic parsing into Python

Create `packages/pdf-extractor/src/slashcash_pdf_extractor/swiggy.py`:

- Port the regex/label logic from `packages/tasks/src/extract/swiggy-deterministic.ts` (`extractSimpleFromPdf`, `extractSimpleFromEmailBody`, `mergeSimpleExtraction`).
- Accept both: `extract_swiggy_invoice(pdf_path)` and `extract_swiggy_body(email_body, subject)`.
- The CLI should accept `--email-body <file>` and `--subject <text>` so Node can pass body alongside the PDF in a single subprocess call.
- Merge logic: PDF wins for invoice-level totals, body wins for `paid_amount` and `payment_method`. If both disagree on totals, record a warning and keep both in `raw.sources` for audit.

### 1.5 Slim the TypeScript pipeline

- `packages/tasks/src/extract/swiggy-deterministic.ts` becomes a thin **validator/normalizer** that takes the typed Python output and produces a `SwiggyMerchant.schema` row. No regex parsing in TS.
- `packages/tasks/src/extract/extract-from-pdf.ts` updates its return type to the new schema and forwards `fields` directly.
- `packages/tasks/src/extract/pipeline.ts` no longer calls `extractSimpleFromEmailBody` separately — body parsing is handled inside the Python subprocess.

### 1.6 Stale name cleanup

This phase deletes legacy ingest names that confuse new agents:

- Delete `packages/tasks/src/agents/slashAIV2.ts` and remove every import. The compat re-export from prior planning is removed in this phase, not deferred.
- Rename `packages/tasks/src/types/email-extraction.ts` → `packages/tasks/src/types/email-extraction.ts`. Update all imports.
- Rename `packages/database/src/queries/transactionsEnhanced.test.ts` → `transactions.test.ts` (or merge into the existing transaction tests if there's no naming clash). The "enhanced" name no longer means anything.
- Delete `OCRModel()` from `packages/tasks/src/ai/model.ts` if it still exists.
- Delete the `ATTACHMENT HANDLING` block in `packages/tasks/src/merchants/base/basePrompt.ts` if it still exists.

After this phase, `rg "slashAIV2|slash AI V2|transaction enhanced|transactionsEnhanced|OCRModel|ATTACHMENT HANDLING"` over `packages/` and `apps/` returns only matches inside `packages/docs/` (history) or migration changelog entries.

## Files touched (expected)

- `packages/pdf-extractor/requirements.txt`
- `packages/pdf-extractor/pyproject.toml`
- `packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py`
- `packages/pdf-extractor/src/slashcash_pdf_extractor/schema.py`
- `packages/pdf-extractor/src/slashcash_pdf_extractor/swiggy.py` (new)
- `packages/pdf-extractor/src/slashcash_pdf_extractor/cli.py`
- `packages/pdf-extractor/scripts/emit_ts_schema.py`
- `packages/pdf-extractor/tests/test_extractor.py`
- `packages/pdf-extractor/tests/test_swiggy.py` (new)
- `packages/tasks/src/extract/pdf-extractor.ts`
- `packages/tasks/src/extract/pdf-extractor-schema.ts`
- `packages/tasks/src/extract/swiggy-deterministic.ts`
- `packages/tasks/src/extract/extract-from-pdf.ts`
- `packages/tasks/src/extract/pipeline.ts`
- `packages/tasks/src/agents/slashAIV2.ts` (delete)
- `packages/tasks/src/types/email-extraction.ts` (rename)
- `packages/tasks/src/ai/model.ts` (delete `OCRModel`)
- `packages/tasks/src/merchants/base/basePrompt.ts` (delete `ATTACHMENT HANDLING`)
- `packages/database/src/queries/transactionsEnhanced.test.ts` (rename/merge)

## Verification commands

The next agent must run these and paste output back into the PR description:

```bash
PYTHONPATH=packages/pdf-extractor/src \
  python -m slashcash_pdf_extractor packages/pdf-extractor/tests/fixtures/swiggy-sample.pdf \
  | jq '{order_id: .fields.order_id, invoice_total: .fields.invoice_total, items: (.fields.items | length), source_quality: .source_quality}'

PYTHONPATH=packages/pdf-extractor/src \
  python -m unittest discover -s packages/pdf-extractor/tests -v

pnpm --filter @workspace/tasks test --run extract
pnpm typecheck
pnpm architecture-smells

rg "slashAIV2|slash AI V2|transaction enhanced|transactionsEnhanced|OCRModel|ATTACHMENT HANDLING" packages apps
```

## Acceptance

- The fixture command above prints a JSON object whose `fields.order_id`, `fields.invoice_total`, `fields.invoice_date`, and `fields.items` match the values visible in the PDF when opened by hand.
- Python tests pass.
- TS extract tests pass.
- `pnpm architecture-smells` passes (schema parity gate green).
- The `rg` cleanup grep returns zero hits outside `packages/docs/`.
- Pipeline runs with `SLASHCASH_SYNC_SKIP_AI=1` and writes correct deterministic rows on the existing IMAP fixture (the `e2e:ingest` smoke from Phase 5 is the harder gate; this phase only requires unit/integration tests pass).

## Out of scope

- Parallelism (Phase 3).
- Onboarding wizard rewiring (Phase 4).
- Real Gmail dogfood (Phase 5).
- Anything that calls a chat model.
