# Testing — customer journeys and release gates

This document defines how slashcash is verified now that Gmail ingest runs through IMAP and app-password-backed local state, and that PDF attachments are converted to text by the local Python lane (Docling) before the single Gemma source extraction pass.

## Testing layers

There are four layers:

1. **Unit tests** next to the code.
2. **Targeted integration tests** for boundary modules where behavior really lives.
3. **Customer-journey UI coverage** in Playwright, booted through the real `slashcash start` path.
4. **Phase acceptance gates** that run the real CLI against fixture or release-like environments.

## Where tests live

- Unit and integration tests live inside each workspace package.
- The E2E harness lives in `packages/e2e-tests`.
- IMAP fixtures live in `packages/e2e-tests/fixtures/imap/` as `.eml` files.
- Analytics fixtures live under `packages/database/test-fixtures/`.
- Python extractor fixtures (small committed PDFs) live under `packages/pdf-extractor/tests/fixtures/` and are exercised by `pytest` or `unittest`.

## Customer-journey suite

`pnpm --filter @workspace/e2e-tests test` drives the seeded app through the same local stack a user runs:

- dashboard load
- navigation
- transaction review
- assistant streaming against the mock Ollama server
- feedback capture

The harness owns setup details such as temporary `SLASHCASH_HOME`, seeded SQLite state, IMAP fixture import, and the mock Ollama endpoint.

## Phase 1 acceptance gate

Phase 1 proves the local stack boots and survives a normal lifecycle:

- `slashcash doctor`
- `slashcash db seed`
- `slashcash start`
- `/api/healthz`
- assistant API smoke
- `slashcash status`
- `slashcash stop`

## Phase 2 acceptance gate (ingest)

Phase 2 now means fixture-backed IMAP ingest + the new Python extractor lane.

`packages/e2e-tests/scenarios/phase-2.ts` (aliased as `e2e:ingest` once the PDF-extractor pivot lands):

- runs `slashcash onboard --dry-run`
- verifies bundled skills
- runs `slashcash doctor --quick`
- runs `slashcash sync --full` against `.eml` IMAP fixtures
- asserts at least one attachment file is written locally
- with `SLASHCASH_PDF_EXTRACTOR_DISABLED` unset on nodes that have Python 3.11+: asserts at least one `transactions_v2` row has `schemaUsed = swiggy.sources.v1` and `dataSource = BOTH` or `PDF_ATTACHMENT`
- with `SLASHCASH_PDF_EXTRACTOR_DISABLED=1`: asserts ingest still succeeds via body-only extraction (`schemaUsed = swiggy.body.v1` or `swiggy.fallback.v1`)
- verifies that disabling `gmail-swiggy` blocks sync

The real-account version of this gate (real Gmail account + real app password + real Docling install + manual diff of transactions against actual receipts) is the PDF-extractor pivot's dogfood step and is intentionally not part of normal fixture CI.

## Phase 3 acceptance gate

`packages/e2e-tests/scenarios/phase-3.ts` exercises the CLI contract:

- `onboard --help`
- `doctor --help`
- `privacy --help`
- `onboard --dry-run --yes`
- idempotent rerun timing
- `doctor --quick --json`
- `privacy`

The full clean-machine cancel-during-`ollama pull` exercise is still a manual dogfood step because it requires interrupting a real model pull.

## Phase 4 acceptance gate

`packages/e2e-tests/scenarios/phase-4.ts` is the meta gate for the test pyramid. It runs:

- architecture smells
- fixture validation
- per-package Vitest suites for `packages/cli`, `packages/tasks`, `packages/database`, `packages/ui`, and `apps/main`

The IMAP boundary replacement for the retired mailbox-wrapper spec is `packages/tasks/src/gmail/imap-client.integration.test.ts`, run with `VITEST_INTEGRATION=1 pnpm --filter @workspace/tasks test`.

## Phase 5 acceptance gate

`packages/e2e-tests/scenarios/phase-5.ts` covers release-readiness checks that do not need external credentials:

- eval gate
- performance budget harness
- logs reader
- pack/bundle smoke

Published-package smoke still lives in release automation and manual dogfood.

## Fixture validation

`pnpm fixtures:check` verifies canonical JSON fixtures and ensures the IMAP fixture directory contains at least one `.eml` file with a `Message-ID` header and trailing newline.

## Architecture smell gate

`packages/e2e-tests/architecture-smells.test.ts` rejects hosted-era regressions and retired mailbox tooling in shipping source. Generated outputs and `packages/docs/` are ignored.

## Python extractor tests

`packages/pdf-extractor/tests/` ships Python tests that exercise:

- happy path: a fixture Swiggy-shaped PDF produces a JSON object whose `raw.text` contains the invoice text
- non-transaction fixture: a non-invoice PDF still returns raw text without crashing
- CLI exit codes: missing file → `2`, unreadable PDF → `1`, unexpected exception → `3`, success → `0`

These run via `pnpm --filter @workspace/pdf-extractor test` (wrapping `python -m pytest`) once the D1 stage in [`../roadmap/pdf-extractor.md`](../roadmap/pdf-extractor.md) lands.

## Schema parity gate

The Python pydantic models in `packages/pdf-extractor/src/slashcash_pdf_extractor/schema.py` and the Zod mirror in `packages/tasks/src/extract/pdf-extractor-schema.ts` must stay in lockstep. `pnpm architecture-smells` runs `python packages/pdf-extractor/scripts/emit_ts_schema.py` and diffs stdout against the committed Zod file; CI fails on drift.

## What stays manual

These still require a real machine, a real Gmail account, or release credentials:

- clean-machine `npm i -g slashcash` verification (including `slashcash doctor --fix` provisioning the Python venv from scratch)
- real Gmail app-password dogfood, with at least five `transactions_v2` rows hand-diffed against real Swiggy receipts to validate the source extraction pass
- cancel-during-`ollama pull` interrupt, then `slashcash doctor --fix` completing the pull and landing green (survived from the retired phase-2 doc)
- npm publish / provenance / SBOM verification
- DNS and hosted-surface shutdown tasks
