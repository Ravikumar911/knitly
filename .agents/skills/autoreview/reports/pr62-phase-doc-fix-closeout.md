# Autoreview Report

- Generated: 2026-06-16T12:01:28.806Z
- Branch: codex/pr62-phase-doc-fix
- Base ref: origin/codex/agentic-adoption-ingest-proof
- Status: clean
- Actionable findings: 0

## Dirty Scope

-  M .agents/skills/add-database-query/SKILL.md
-  M .agents/skills/add-trpc-route/SKILL.md
-  M .agents/skills/ingest-edge-sweep/SKILL.md
-  M .agents/skills/ingest-proof/reports/latest/real-behavior-proof.json
-  M .agents/skills/ingest-proof/reports/latest/real-behavior-proof.md
-  M .agents/skills/playwright-best-practices/SKILL.md
-  M .agents/skills/run-tests/SKILL.md
-  M .agents/skills/write-ai-sdk-tool/SKILL.md
-  M AGENTIC-ADOPTION-PROOF.md
-  M AGENTS.md
-  M package.json
-  M packages/docs/current-state.md
-  M packages/docs/reference/testing.md
-  M packages/docs/roadmap/agentic-coding-adoption.md
-  M packages/e2e-tests/package.json
-  M packages/e2e-tests/scripts/real-behavior-proof.ts
-  M packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py
-  M packages/pdf-extractor/tests/test_extractor.py
-  M qa/README.md
-  M qa/scenarios.md
-  M qa/scenarios/index.md
-  M qa/scenarios/ingest/food-delivery-edges.md
-  M qa/scenarios/ingest/replays/pdf-vs-body.jsonl
- ?? .agents/skills/autoreview/reports/pr62-phase-doc-fix-closeout.json
- ?? .agents/skills/autoreview/reports/pr62-phase-doc-fix-closeout.md
- ?? packages/e2e-tests/scripts/qa-ingest-check.ts

## Committed Scope

None

## Ingest Changes

- packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py
- packages/pdf-extractor/tests/test_extractor.py
- qa/scenarios/ingest/food-delivery-edges.md
- qa/scenarios/ingest/replays/pdf-vs-body.jsonl

Ingest changes require sibling analysis across pipeline, body fallback, body signals, merchant schema, PDF extractor, fixtures, goldens, and provenance handling.

## Sibling Scan

### packages/pdf-extractor/src/slashcash_pdf_extractor/extractor.py
- packages/tasks/src/extract/pipeline.ts:6 - runtime merge point for PDF, LLM, fallback, schemaUsed, dataSource, and storage provenance
- packages/tasks/src/extract/body-fallback.ts:3 - body-only fallback owner for deterministic Swiggy extraction
- packages/tasks/src/extract/swiggy-body-signals.ts:8 - shared order id, amount, restaurant, payment method, and marketing signal parser
- packages/tasks/src/extract/swiggy-llm.ts:11 - LLM-normalization sibling that reuses body signals and provenance decisions
- packages/tasks/src/extract/pdf-extractor.ts:1 - Python PDF extractor bridge and subprocess failure behavior
- packages/tasks/src/extract/pdf-extractor-schema.ts:1 - typed contract for parsed PDF fields and source quality
- packages/tasks/src/extract/swiggy-deterministic.ts:1 - provenance type shared by deterministic pipeline outputs
- packages/tasks/src/merchants/swiggy/schema.ts:14 - merchant schema used to validate transaction fields
- packages/tasks/src/extract/body-fallback.test.ts:2 - focused fallback fixture coverage
- packages/tasks/src/extract/swiggy-body-signals.test.ts:3 - focused marketing and body signal coverage
- packages/tasks/src/extract/pipeline.test.ts:21 - pipeline behavior coverage for schemaUsed, dataSource, and provenance
- packages/tasks/src/extract/pipeline.integration.test.ts:4 - real extractor integration gate when VITEST_INTEGRATION is enabled
- packages/e2e-tests/fixtures/imap/swiggy-body-only.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/scripts/fixtures-check.ts:1 - fixture canonicalization and EML sanity gate

### packages/pdf-extractor/tests/test_extractor.py
- packages/tasks/src/extract/pipeline.ts:6 - runtime merge point for PDF, LLM, fallback, schemaUsed, dataSource, and storage provenance
- packages/tasks/src/extract/body-fallback.ts:3 - body-only fallback owner for deterministic Swiggy extraction
- packages/tasks/src/extract/swiggy-body-signals.ts:8 - shared order id, amount, restaurant, payment method, and marketing signal parser
- packages/tasks/src/extract/swiggy-llm.ts:11 - LLM-normalization sibling that reuses body signals and provenance decisions
- packages/tasks/src/extract/pdf-extractor.ts:1 - Python PDF extractor bridge and subprocess failure behavior
- packages/tasks/src/extract/pdf-extractor-schema.ts:1 - typed contract for parsed PDF fields and source quality
- packages/tasks/src/extract/swiggy-deterministic.ts:1 - provenance type shared by deterministic pipeline outputs
- packages/tasks/src/merchants/swiggy/schema.ts:14 - merchant schema used to validate transaction fields
- packages/tasks/src/extract/body-fallback.test.ts:2 - focused fallback fixture coverage
- packages/tasks/src/extract/swiggy-body-signals.test.ts:3 - focused marketing and body signal coverage
- packages/tasks/src/extract/pipeline.test.ts:21 - pipeline behavior coverage for schemaUsed, dataSource, and provenance
- packages/tasks/src/extract/pipeline.integration.test.ts:4 - real extractor integration gate when VITEST_INTEGRATION is enabled
- packages/e2e-tests/fixtures/imap/swiggy-body-only.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/scripts/fixtures-check.ts:1 - fixture canonicalization and EML sanity gate

### qa/scenarios/ingest/food-delivery-edges.md
- packages/tasks/src/extract/pipeline.ts:6 - runtime merge point for PDF, LLM, fallback, schemaUsed, dataSource, and storage provenance
- packages/tasks/src/extract/body-fallback.ts:3 - body-only fallback owner for deterministic Swiggy extraction
- packages/tasks/src/extract/swiggy-body-signals.ts:8 - shared order id, amount, restaurant, payment method, and marketing signal parser
- packages/tasks/src/extract/swiggy-llm.ts:11 - LLM-normalization sibling that reuses body signals and provenance decisions
- packages/tasks/src/extract/pdf-extractor.ts:1 - Python PDF extractor bridge and subprocess failure behavior
- packages/tasks/src/extract/pdf-extractor-schema.ts:1 - typed contract for parsed PDF fields and source quality
- packages/tasks/src/extract/swiggy-deterministic.ts:1 - provenance type shared by deterministic pipeline outputs
- packages/tasks/src/merchants/swiggy/schema.ts:14 - merchant schema used to validate transaction fields
- packages/tasks/src/extract/body-fallback.test.ts:2 - focused fallback fixture coverage
- packages/tasks/src/extract/swiggy-body-signals.test.ts:3 - focused marketing and body signal coverage
- packages/tasks/src/extract/pipeline.test.ts:21 - pipeline behavior coverage for schemaUsed, dataSource, and provenance
- packages/tasks/src/extract/pipeline.integration.test.ts:4 - real extractor integration gate when VITEST_INTEGRATION is enabled
- packages/e2e-tests/fixtures/imap/swiggy-body-only.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/scripts/fixtures-check.ts:1 - fixture canonicalization and EML sanity gate

### qa/scenarios/ingest/replays/pdf-vs-body.jsonl
- packages/tasks/src/extract/pipeline.ts:6 - runtime merge point for PDF, LLM, fallback, schemaUsed, dataSource, and storage provenance
- packages/tasks/src/extract/body-fallback.ts:3 - body-only fallback owner for deterministic Swiggy extraction
- packages/tasks/src/extract/swiggy-body-signals.ts:8 - shared order id, amount, restaurant, payment method, and marketing signal parser
- packages/tasks/src/extract/swiggy-llm.ts:11 - LLM-normalization sibling that reuses body signals and provenance decisions
- packages/tasks/src/extract/pdf-extractor.ts:1 - Python PDF extractor bridge and subprocess failure behavior
- packages/tasks/src/extract/pdf-extractor-schema.ts:1 - typed contract for parsed PDF fields and source quality
- packages/tasks/src/extract/swiggy-deterministic.ts:1 - provenance type shared by deterministic pipeline outputs
- packages/tasks/src/merchants/swiggy/schema.ts:14 - merchant schema used to validate transaction fields
- packages/tasks/src/extract/body-fallback.test.ts:2 - focused fallback fixture coverage
- packages/tasks/src/extract/swiggy-body-signals.test.ts:3 - focused marketing and body signal coverage
- packages/tasks/src/extract/pipeline.test.ts:21 - pipeline behavior coverage for schemaUsed, dataSource, and provenance
- packages/tasks/src/extract/pipeline.integration.test.ts:4 - real extractor integration gate when VITEST_INTEGRATION is enabled
- packages/e2e-tests/fixtures/imap/swiggy-body-only.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-body-only.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-promotion.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.eml:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/fixtures/imap/swiggy-status-update.expected.json:1 - committed EML fixtures and expected JSON proof inputs
- packages/e2e-tests/scripts/fixtures-check.ts:1 - fixture canonicalization and EML sanity gate

## Gates

- pass pnpm qa:ingest (781ms)
- pass pnpm e2e:ingest (4s)

## Findings

No actionable findings.

