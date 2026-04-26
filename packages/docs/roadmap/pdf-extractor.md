# Swiggy Ingest Pivot — index

> _Revision date: 2026-04-26. This is the **active** execution plan, split into five phase files. Older phase docs from earlier pivots have already shipped and were deleted; their summaries live in [`../current-state.md`](../current-state.md). Each agent picks up the next pending phase file and works it top-to-bottom._

## One-paragraph picture

Swiggy ingestion should not depend on Gemma, Ollama, OpenAI, or any other generative model. Exact transaction values already live in the email body and the attached PDF — a deterministic Python extractor reads both, the TypeScript pipeline validates and stores them, and the assistant tab is the only place a chat model is invoked. Ingest runs in parallel so a 365-day Swiggy sync finishes in seconds, and onboarding only asks for Gmail email + app password — model setup happens later, on the assistant tab itself.

## Phase files (read in order)

| #   | File                       | Goal                                                                   |
| --- | -------------------------- | ---------------------------------------------------------------------- |
| 1   | [`phase-1.md`](./phase-1.md) | Lock the deterministic Python extractor (Docling + PyMuPDF + pdfplumber, no LLM) |
| 2   | [`phase-2.md`](./phase-2.md) | Remove AI from ingestion; assistant code is the only consumer of chat models |
| 3   | [`phase-3.md`](./phase-3.md) | Parallelize IMAP fetch, PDF subprocess extraction, and SQLite writes; target `< 20s` for 1-year Swiggy sync |
| 4   | [`phase-4.md`](./phase-4.md) | Fast onboarding (Gmail + app password only); assistant provider setup happens after the dashboard opens (Local Ollama / OpenAI-compatible / Anthropic) |
| 5   | [`phase-5.md`](./phase-5.md) | Fixtures, golden tests, real-account dogfood, and cleanup of legacy names |

Each phase file is self-contained: goals, work items, files touched, verification commands, acceptance criteria, and explicit out-of-scope items.

## Completed baseline (do not re-plan)

These pieces already exist in the repo and should be treated as inputs, not as fresh work:

- `packages/pdf-extractor/` — Python CLI, pydantic schema, Docling adapter, fixture PDFs, and `unittest` suite.
- `packages/tasks/src/extract/pdf-extractor.ts` — spawns the Python extractor and validates stdout via Zod.
- `packages/tasks/src/extract/swiggy-deterministic.ts` — deterministic Swiggy mapping (slimmed in Phase 1).
- `packages/tasks/src/extract/pipeline.ts` — tries deterministic extraction before any model call (the model branch is removed in Phase 2).
- `packages/tasks/src/trigger/processEmails.ts` — IMAP-driven sync with single-flight mutex (rewired into a staged pipeline in Phase 3).
- The `e2e:ingest`, `e2e:cli`, `e2e:pyramid`, `e2e:release` aliases for the old phase scripts.

## Research summary (library decision)

| Layer                          | Library                          | Notes                                                                 |
| ------------------------------ | -------------------------------- | --------------------------------------------------------------------- |
| Primary PDF conversion         | Docling                          | Layout-aware markdown + tables; already pinned                       |
| Fast PDF probe                 | PyMuPDF                          | Detects text-vs-image, encryption, page count, empty pages           |
| Deterministic table fallback   | pdfplumber                       | No Java dep; char/table coordinates; great for invoice text          |
| OCR fallback (gated, off by default) | pytesseract / OCRmyPDF      | Only for scanned PDFs; off until fixtures justify it                 |
| Email body parsing             | Python regex inside the extractor | Removes the TypeScript-side regex duplication                        |

LLM/VLM extractors (Qwen, Gemma, OpenAI, Claude, …) are explicitly **not** part of the ingest path. They remain available to the assistant.

## Guardrails for every phase

- Do not add hosted queues, hosted auth, Supabase, Trigger.dev, or cloud OCR.
- Do not persist model-extracted Swiggy fields by default. Deterministic Python output is the source of truth.
- Do not bypass `@workspace/database` query helpers from app or task code.
- Do not parallelize SQLite writes without an explicit single-writer queue.
- Do not hide failed PDFs as successful transactions; store provenance and classify the email outcome.
- Keep assistant/provider work in `apps/main/` and out of `packages/tasks/`. Architecture-smell rules in Phase 5 enforce this.
- After each phase, the next agent runs that phase's full **Verification commands** block before opening a PR.

## How to use this plan

1. Open the lowest-numbered phase file whose status is "Pending".
2. Read its full work-items list, files-touched list, and verification block.
3. Implement, run the verification commands, and paste the output into the PR description.
4. When the phase ships, mark it "Shipped" at the top of its file (do not delete the file — Phase 5 cleans up history at the end of the pivot).
5. Move on to the next phase only after the current phase's acceptance criteria are met.
