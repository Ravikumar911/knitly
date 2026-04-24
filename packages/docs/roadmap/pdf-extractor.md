# PDF Extractor Pivot — deterministic invoice parsing + AI reconciliation (active plan)

> _Revision date: 2026-04-23. This is the **active** execution plan. The next agent works from this file. The previous phase docs (`phase-1.md` … `phase-4.md`, `pivot-imap.md`) shipped and were retired on 2026-04-23; their surviving residue is summarised in [`../current-state.md`](../current-state.md) under "Retired phase docs"._

## Why we're pivoting

Today `packages/tasks/src/agents/slashAIV2.ts` claims to parse PDFs with the local model. In practice it does not: `buildPrompt` passes `attachments[*].filename` and `mimeType` into the Gemma prompt as **text**, the PDF bytes never reach the model, and `gemma3n:e4b` is not a strong document-extraction model even when they do. That means every Swiggy row we store today is either:

- body-derived, with the regex fallback in `processEmails.ts:245-268` (orderId, amount, area) papering over the gap, or
- body-derived through `generateObject`, with attachment content ignored.

Receipts that only carry the totals-and-tax breakdown in the PDF are parsed from the email body copy, which is frequently incomplete (no per-item breakdown, no rounded tax, no exact order subtotals). We promised a "local model reads PDFs" story in vision.md; we shipped "local model reads headers".

The correct shape is a split pipeline:

- **Email body (text + inline images)** → Gemma over Ollama, extracts a structured candidate object.
- **PDF attachments** → a deterministic, locally-installed Python extractor (Docling), emits a second structured candidate object.
- **Merge pass** → Gemma reconciles the two candidates into the single authoritative row we write to `transactions_v2`.

Determinism lives in the PDF lane where the product needs it; judgement lives in the merge pass where the model earns its keep.

## Decision summary

The full ADRs live in [`../reference/decisions.md`](../reference/decisions.md) — **ADR-026** (Docling as the PDF extractor) and **ADR-027** (Python invoked per-PDF as a subprocess, with deps pinned in `~/.slashcash/py-venv`). In one paragraph:

Docling ([github.com/DS4SD/docling](https://github.com/DS4SD/docling), MIT, IBM-maintained) is the PDF parser. It runs fully offline, reads layout-aware tables — the thing Swiggy PDFs actually ship — and emits a structured `DocumentConverter` result we adapt to a stable JSON shape. Node spawns `python3` per PDF via `child_process.spawn` against a venv that `slashcash doctor --fix` provisions at `~/.slashcash/py-venv` from a pinned `packages/pdf-extractor/requirements.txt`. There is **no long-lived sidecar** in v1. If the venv is missing or the extractor fails, ingest degrades to "email-body-only Gemma extraction" (the current fallback path, minus the attachment-aware prompt bits) and `slashcash doctor` surfaces the Python environment state as a first-class check.

## What gets kept

- The whole IMAP ingest path (`packages/tasks/src/trigger/processEmails.ts`, `gmail/imap-client.ts`, `utils/imap-errors.ts`). The PDFs it produces just go into a new lane before hitting the extractor.
- `packages/tasks/src/utils/attachments-fs.ts`. Docling reads from the same on-disk attachments.
- The `transactions_v2` / `parsed_emails` schema. The extractor writes through `storeTransactionV2Input`, same contract.
- `packages/tasks/src/merchants/swiggy/schema.ts`. Same Zod surface; the merge pass validates against it.
- `slashcash doctor`, the `Step { detect / install / verify }` pipeline, the single-flight mutex, the skills registry. None of these are auth- or extractor-aware.
- The `@clack/prompts` wizard. `onboard` gains one new step (`python-env`) that delegates to doctor-style install; it does not regrow into a Python setup wizard.

## What gets deleted or rewritten

- Rewrite `packages/tasks/src/agents/slashAIV2.ts` into two named agents plus a merger: `extractFromEmailBody()`, `extractFromPdf()` (the new wrapper), `reconcileExtractions()`. The "attachments passed as filename text in the prompt" branch of `buildPrompt` is deleted.
- `packages/tasks/src/merchants/base/basePrompt.ts` — delete the `ATTACHMENT HANDLING` section; it describes behaviour we no longer do in-prompt.
- `packages/tasks/src/merchants/swiggy/prompt.ts` — add a small "reconciliation rules" block for the merge pass (prefer PDF `amount` and `order_id`, prefer email `from/date`, penalise confidence on mismatch).
- `OCRModel()` in `packages/tasks/src/ai/model.ts` — delete. It aliased Gemma and pretended a vision path existed; the real vision model call was never wired.
- The regex `fallbackSwiggy` in `processEmails.ts` — kept for v1 because ADR-027's fallback mode still uses it for amounts; moved into `packages/tasks/src/extract/body-fallback.ts` so the new agents don't import from `trigger/`.

## What gets built

Every stage below ends on a commit that passes `pnpm typecheck`, `pnpm lint`, `pnpm architecture-smells`, and the stage's specific fixture gate.

### D0 — ADRs + scaffolding (S)

One doc-only PR. Lands ADR-026 and ADR-027 in `reference/decisions.md`. Adds the dated in-place note on ADR-005 (the "Gemma is the one model" claim is now "Gemma handles chat + email-body extraction + reconciliation; Docling handles PDFs"). Adds the dated in-place note on ADR-009 (the standalone Next.js bundle is unchanged, but the published npm package now documents a runtime dependency on Python 3.11+ via `doctor --fix`). Updates `architecture.md` to show the two-lane flow. Updates `README.md` reading order. Updates `current-state.md` to collapse the retired phase docs into a single "Retired phase docs" section with one-line shipped summaries. Deletes `roadmap/phase-1.md`, `phase-2.md`, `phase-3.md`, `phase-4.md`, `pivot-imap.md`.

Exit: `ls packages/docs/roadmap/` shows only this file. `pnpm --filter @workspace/docs build` (if it exists; otherwise a plain link check) passes. No broken cross-links in the surviving docs.

### D1 — `packages/pdf-extractor/` Python package (M)

First Python package in the monorepo. Sits alongside the TypeScript workspaces in `packages/` so Turbo can `--filter` it; Turbo does not orchestrate the Python build, but proximity keeps the package layout uniform.

Shape:

```
packages/pdf-extractor/
├── pyproject.toml            # package metadata; build-system = setuptools
├── requirements.txt          # pinned runtime deps (docling==<pin>, pydantic>=2)
├── requirements-dev.txt      # pytest, ruff, mypy
├── README.md                 # how Node calls us; schema contract
├── src/slashcash_pdf_extractor/
│   ├── __init__.py
│   ├── __main__.py           # `python -m slashcash_pdf_extractor <pdf>` entrypoint
│   ├── cli.py                # argv parsing, IO, exit codes
│   ├── extractor.py          # Docling adapter → canonical schema
│   └── schema.py             # pydantic models mirroring the TS Zod schema
├── tests/
│   ├── fixtures/             # small committed PDFs
│   │   └── swiggy-sample.pdf # copied from .artifacts/playwright
│   ├── test_extractor.py
│   └── test_cli.py
└── .python-version           # pinned Python minor, read by pyenv / mise
```

Key properties the contract guarantees:

- **Executable.** `python -m slashcash_pdf_extractor <path-to-pdf>` reads a local PDF, writes a single JSON object to stdout, writes human-readable diagnostics to stderr, and exits `0` on success / `1` on deterministic extractor failure / `2` on bad argv / `3` on unexpected exception.
- **JSON schema is the API.** The Python `schema.py` and the Node Zod schema at `packages/tasks/src/extract/pdf-extractor-schema.ts` must stay in lockstep. A generator lives in `packages/pdf-extractor/scripts/emit_ts_schema.py` that prints the Zod definition from the pydantic models; architecture-smells asserts the two files match (see D5).
- **Fully offline.** No network calls. The test harness runs in a Python venv with `PIP_INDEX_URL=` unset and `HTTP_PROXY` off after install.
- **No state.** The extractor is pure: `(pdf_bytes | pdf_path) -> json`. No caching, no writes. The Node caller handles attachment filesystem layout.
- **Pinned deps.** Each `requirements.txt` entry has a `==` exact version plus a SHA256 hash. `pip install --require-hashes` in CI catches supply-chain drift.

Canonical JSON payload (the contract; final shape locked during implementation but this is the floor):

```json
{
  "schemaVersion": "1",
  "extractor": "docling",
  "extractorVersion": "<docling x.y.z>",
  "merchant": "swiggy",
  "confidence": 0.93,
  "fields": {
    "orderId": "1234567890",
    "totalAmount": 482.5,
    "currency": "INR",
    "transactionDate": "2026-04-18T19:42:00+05:30",
    "items": [
      { "name": "Paneer Tikka", "quantity": 1, "unitPrice": 320, "lineTotal": 320 }
    ],
    "taxes": { "gst": 23.1, "serviceCharge": 0 },
    "delivery": { "address": "…", "pincode": "560001", "fee": 45 },
    "paymentMethod": "UPI"
  },
  "warnings": ["tax block missing"],
  "raw": {
    "pageCount": 2,
    "tables": [...],
    "text": "…"
  }
}
```

Tests:

- `pytest` runs against committed fixture PDFs (`tests/fixtures/swiggy-sample.pdf`, plus a negative fixture that is not a Swiggy receipt). Golden JSON snapshots live alongside the fixtures. Snapshot changes land in a visible diff.
- CLI tests cover: missing file → exit 2, unreadable PDF → exit 1, successful extract → exit 0 with valid JSON.

Exit: `pip install -r requirements.txt && python -m slashcash_pdf_extractor packages/pdf-extractor/tests/fixtures/swiggy-sample.pdf` prints a JSON object whose `fields.totalAmount` matches the golden value. `python -m pytest packages/pdf-extractor` is green.

### D2 — `slashcash doctor` Python environment check (M)

New check: `python-env`. Runs as part of `slashcash doctor` and `slashcash doctor --fix`. Its job:

- Detect `python3 --version` on `PATH`. Require 3.11+. If missing, the symptom/cause/fix block points at `brew install python@3.12`.
- Ensure `~/.slashcash/py-venv/` exists. If not and `--fix` is set, run `python3 -m venv ~/.slashcash/py-venv`.
- Ensure `~/.slashcash/py-venv/bin/python -m pip install --require-hashes -r packages/pdf-extractor/requirements.txt` has been run. Track state via a hash file at `~/.slashcash/py-venv/.slashcash.install-hash` whose contents are `sha256(requirements.txt)`. If the hash drifts, `--fix` re-runs the install.
- Sanity-check: `~/.slashcash/py-venv/bin/python -m slashcash_pdf_extractor --version` returns `0`.

Files:

- **create** `packages/cli/src/doctor/python-env.ts` — the new `Check`.
- **create** `packages/cli/src/python/env.ts` — shared helper that returns `{ pythonBin: string, venvDir: string, extractorEntry: string[] }` for doctor and for the ingest path, or throws a classified `PythonEnvError`.
- **create** `packages/cli/src/python/errors.ts` — closed error union: `{python-missing, python-too-old, venv-create-failed, pip-install-failed, extractor-import-failed, unknown}`.
- **modify** `packages/cli/src/doctor/checks.ts` — registers the new check.
- **modify** `packages/cli/src/doctor/repairs.ts` — the `python-env` repair.
- **modify** `packages/cli/src/onboard/run.ts` — new `python-env` step between `db-migrate` and `bundled-skills`; it calls the same repair code doctor uses, so the wizard does not duplicate logic. The step shows a single spinner line: `Installing PDF extractor (~60s first time, cached after)`.

How the extractor path is surfaced at runtime:

- `~/.slashcash/py-venv/bin/python` is the canonical binary.
- The entrypoint arg vector is `[pythonBin, "-m", "slashcash_pdf_extractor"]` plus `[pdfAbsolutePath]`.
- The environment variable `SLASHCASH_PDF_EXTRACTOR_DISABLED=1` short-circuits the whole lane for E2E and for users who want to opt out. When set, the ingest path skips Docling and reports dataSource `EMAIL_BODY`.

Exit: `slashcash doctor --quick` reports `python-env` as `ok` or gives a clean symptom/cause/fix block. `slashcash doctor --fix` from a clean machine lands green within ~60s of pip install time on a normal broadband link.

### D3 — Node-side extractor wrapper (M)

New module under `packages/tasks/src/extract/`:

```
packages/tasks/src/extract/
├── pdf-extractor-schema.ts   # Zod mirror of schema.py
├── pdf-extractor.ts          # spawn helper; Result<PdfExtraction, PdfExtractError>
├── body-fallback.ts          # moved from processEmails.ts:245-268
└── pdf-extractor.test.ts
```

`pdf-extractor.ts`:

- `extractPdf(absolutePath: string, opts?: { timeoutMs?: number, signal?: AbortSignal }): Promise<Result<PdfExtraction, PdfExtractError>>`
- Uses `child_process.spawn` with a 30s default timeout, captures stdout/stderr separately, kills with SIGTERM on timeout and SIGKILL 2s later.
- Parses stdout with `JSON.parse`, then `PdfExtractionSchema.safeParse`. On any failure — non-zero exit, malformed JSON, schema mismatch — returns a classified error.
- Never throws. Callers deal in `Result`.

Closed error union `PdfExtractError`: `{ pdf-extractor-not-ready, pdf-extractor-timeout, pdf-extractor-crashed, pdf-extractor-bad-output, pdf-extractor-unsupported-format, pdf-extractor-empty, unknown }`.

Unit + integration tests:

- Unit: mock `child_process.spawn` to exercise each `PdfExtractError` branch and the happy path.
- Integration (`VITEST_INTEGRATION=1`): actually invoke the Python extractor via the doctor-installed venv against `packages/pdf-extractor/tests/fixtures/swiggy-sample.pdf`. Skipped by default; required on CI nodes that have the venv provisioned (the existing Python-less CI nodes skip cleanly).

Exit: `pnpm --filter @workspace/tasks test` is green. `pnpm --filter @workspace/tasks test --run extract` asserts each error branch is reachable. With a real venv, the integration spec produces the same `totalAmount` as the Python golden JSON.

### D4 — Split extraction pipeline (M)

Rewire `slashAIV2.ts` into the three-agent flow. Files:

```
packages/tasks/src/extract/
├── extract-from-email-body.ts
├── extract-from-pdf.ts            # thin wrapper over pdf-extractor.ts that maps to merchant schema
├── reconcile-extractions.ts       # Gemma merge pass
└── pipeline.ts                    # orchestrator used by processEmails.ts
```

Flow in `pipeline.ts` for a single Gmail message:

1. **Body pass.** Call `extractFromEmailBody(emailData)` → Gemma `generateObject` with the existing Swiggy schema, prompt rewritten to "body-only". Returns `{ candidate, confidence }` or `null` if the body is empty / non-matching.
2. **PDF pass.** For each attachment where `mimeType === "application/pdf"`, call `extractPdf(attachmentAbsPath)`. If it returns `err`, record the error on the `EmailData.parseErrors` array and continue with body-only.
3. **Merge pass.** If both candidates exist, call `reconcileExtractions({ body, pdf })` → Gemma with a short, structured prompt that passes both candidates as JSON and asks for the merged authoritative object, using the merchant-specific reconciliation rules block from `swiggy/prompt.ts`. Schema-validated the same way extraction is.
4. **Fallback.** If the model refuses, retries once with temperature `0.0`. If that still fails, prefer the PDF candidate when present (it is deterministic), otherwise the body candidate. If neither exists, drop to `body-fallback.ts` (current regex path).
5. **Write.** Call `storeTransactionV2Input` with `dataSource` set to `PDF_ATTACHMENT` when the PDF candidate contributed, `EMAIL_BODY` otherwise, and `schemaUsed = "swiggy.docling.v1"` vs `"swiggy.body.v1"` vs `"swiggy.fallback.v1"`.

Delete `OCRModel()` in `packages/tasks/src/ai/model.ts`. Delete the `ATTACHMENT HANDLING` block in `base/basePrompt.ts`. Delete the attachments-into-prompt branch in the now-legacy `buildPrompt`. Add the "reconciliation rules" block to `swiggy/prompt.ts` — at minimum: prefer PDF amount; prefer PDF orderId; prefer email `from` / `date`; if amount disagrees by >1%, halve the merged confidence and add a `"amount mismatch"` warning.

Unit tests cover:

- body-only messages (no attachment) → uses body pass only.
- PDF-only signal (empty body) → uses PDF pass only, merge pass is skipped.
- Both present with matching amounts → merge yields the PDF amount with high confidence.
- Both present with divergent amounts → merge yields the PDF amount with a warning and halved confidence.
- PDF extractor fails → degrades to body-only; classified error surfaces on the `parsed_emails` row.
- Model refusal twice → falls back via `body-fallback.ts` for amount/orderId.

Exit: `pnpm e2e:phase-2` (soon to be renamed; see D6) ingests a fixture message whose PDF amount differs from the body amount and asserts the stored row reflects the PDF amount with confidence < 0.5.

### D5 — Architecture smells + schema parity (S)

- New forbidden-import rule in `packages/e2e-tests/architecture-smells.test.ts`: no direct imports of `@workspace/tasks/src/agents/slashAIV2` from outside the deprecation compat shim (the file becomes a one-liner re-export for one release, then deleted in D6).
- New rule: `packages/pdf-extractor/src/slashcash_pdf_extractor/schema.py` and `packages/tasks/src/extract/pdf-extractor-schema.ts` must have the same logical shape. Implemented by running `python packages/pdf-extractor/scripts/emit_ts_schema.py` and diffing stdout against the committed Zod file; CI fails on drift.
- New rule: no `spawn('python'` calls outside `packages/cli/src/python/**` and `packages/tasks/src/extract/pdf-extractor.ts`. Prevents ad-hoc Python shelling from creeping in.
- Extend `pnpm architecture-smells` to also scan `packages/pdf-extractor/requirements.txt` for unpinned versions (no `>=`, no `~=` without a trailing `==` inline) — keeps D1's pinning promise honest.

Exit: `pnpm architecture-smells` passes. Edits to either schema file without updating the other fail CI.

### D6 — E2E, fixtures, dogfood (M)

- Add a PDF-bearing `.eml` fixture to `packages/e2e-tests/fixtures/imap/` (the existing `.artifacts/playwright/slashcash-home/attachments/fixture-msg-1.pdf` is already a valid Swiggy-shaped receipt; wrap it in a fixture `.eml`).
- Update `packages/e2e-tests/scenarios/phase-2.ts` to assert the ingest ran the full three-pass pipeline: the `parsed_emails.parseSuccess` column is true, the `transactions_v2.schemaUsed` column is `swiggy.docling.v1`, and at least one row has `dataSource = PDF_ATTACHMENT`.
- Rename the E2E phase scripts to what they actually gate: `e2e:ingest` (old `e2e:phase-2`), `e2e:cli` (old `e2e:phase-3`), `e2e:pyramid` (old `e2e:phase-4`), `e2e:release` (old `e2e:phase-5`). Keep the old names as deprecated aliases for one release cycle.
- Real-account dogfood: on a maintainer machine with a real Gmail + app password and Docling installed, run `slashcash sync --full` against a one-week window. Manually diff five `transactions_v2` rows against the actual receipts in Gmail — amounts, item counts, order IDs. File any delta as a Docling prompt/schema tweak in a follow-up PR.

Exit: all renamed `pnpm e2e:*` scripts are green. The real-account dogfood has a written pass record linked from [`../current-state.md`](../current-state.md).

## Re-ordered execution plan

Each row ends on a green repo.

| #  | Workstream                                                                                            | Size | Depends on |
| -- | ----------------------------------------------------------------------------------------------------- | ---- | ---------- |
| D0 | ADRs + architecture + README + retired phase-docs collapse (this doc lands, old phase docs deleted)   | S    | —          |
| D1 | `packages/pdf-extractor/` Python package + pinned venv + pytest fixtures                              | M    | D0         |
| D2 | `slashcash doctor --fix` provisions the venv; onboard step; `python-env` failure classifier           | M    | D1         |
| D3 | Node-side `extractPdf()` wrapper + Zod mirror + classified error union                                | M    | D2         |
| D4 | Split pipeline: `extract-from-email-body`, `extract-from-pdf`, `reconcile-extractions`; delete OCR    | M    | D3         |
| D5 | Architecture-smell rules + schema-parity gate + pinning check                                         | S    | D4         |
| D6 | Real-fixture E2E + renamed `e2e:*` scripts + real-account dogfood                                     | M    | D5         |

## Exit gate for the pivot

Done when **all** of these hold:

1. A clean macOS machine with Homebrew + Python 3.11+, after `npm i -g slashcash` and `slashcash onboard`, reaches a populated Swiggy dashboard where at least one transaction has `dataSource = PDF_ATTACHMENT` and `schemaUsed = swiggy.docling.v1`.
2. `slashcash doctor` is green; the `python-env` check goes through the install flow on a fresh machine without manual intervention.
3. `rg "OCRModel|ATTACHMENT HANDLING" packages/` returns zero hits in shipping source.
4. Divergent-amount fixture message: stored row reflects the PDF amount; `extractionConfidence < 0.5`; a `"amount mismatch"` warning is preserved in `merchantData`.
5. Python extractor offline: with `SLASHCASH_PDF_EXTRACTOR_DISABLED=1`, ingest still succeeds via body-only extraction and `doctor` reports the Python lane as intentionally disabled.
6. ADR-026, ADR-027, and the dated in-place note on ADR-005 are committed; every cross-link in `packages/docs/` resolves; no link to a deleted phase doc survives.

## What this pivot explicitly is not

- **Not a rewrite of the assistant.** The chat assistant stays on Gemma. Only the ingest-time extraction changes.
- **Not a new bundler story.** Node continues to ship a pure Node bundle. Python is a runtime dep of the local machine, installed by doctor, not packed into the npm tarball.
- **Not a return to remote PDF parsing.** No OpenAI, Mistral, or cloud-OCR service. Docling is local.
- **Not a sidecar service.** No long-lived Python process in v1. `spawn` per PDF is fine because ingest is low-QPS and batch-bounded.
- **Not multi-merchant.** The reconciliation rules block is Swiggy-only in v1. Bank / Phonepe / etc. reuse the lane once the merge-pass contract is proven.
