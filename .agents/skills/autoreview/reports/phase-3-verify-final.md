# Autoreview Report

- Generated: 2026-06-12T13:02:11.804Z
- Branch: main
- Base ref: origin/main
- Status: actionable
- Actionable findings: 4

## Dirty Scope

-  M .agents/skills/run-tests/SKILL.md
-  M AGENTS.md
-  M apps/main/AGENTS.md
-  M package.json
-  M packages/docs/README.md
-  M packages/docs/current-state.md
-  M packages/docs/reference/testing.md
-  M packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json
-  M packages/e2e-tests/package.json
-  M packages/e2e-tests/tests/assistant-feedback.spec.ts
-  M packages/tasks/README.md
-  M packages/tasks/src/extract/pipeline.integration.test.ts
-  M packages/tasks/src/extract/pipeline.test.ts
-  M packages/tasks/src/extract/pipeline.ts
- ?? .agents/skills/autoreview/SKILL.md
- ?? .agents/skills/autoreview/reports/.gitignore
- ?? .agents/skills/autoreview/reports/phase-3-verify.json
- ?? .agents/skills/autoreview/reports/phase-3-verify.md
- ?? .agents/skills/autoreview/scripts/autoreview
- ?? .agents/skills/autoreview/scripts/autoreview.mjs
- ?? .agents/skills/autoreview/scripts/self-test.mjs
- ?? .agents/skills/ingest-proof/SKILL.md
- ?? .agents/skills/ingest-proof/reports/.gitignore
- ?? .agents/skills/ingest-proof/reports/latest/real-behavior-proof.json
- ?? .agents/skills/ingest-proof/reports/latest/real-behavior-proof.md
- ?? AGENTIC-ADOPTION-PROOF.md
- ?? packages/docs/roadmap/agentic-coding-adoption.md
- ?? packages/e2e-tests/scripts/real-behavior-proof.ts

## Committed Scope

None

## Ingest Changes

- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json
- packages/tasks/src/extract/pipeline.integration.test.ts
- packages/tasks/src/extract/pipeline.test.ts
- packages/tasks/src/extract/pipeline.ts

Ingest changes require sibling analysis across pipeline, body fallback, body signals, merchant schema, PDF extractor, fixtures, goldens, and provenance handling.

## Sibling Scan

### packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json
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

### packages/tasks/src/extract/pipeline.integration.test.ts
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

### packages/tasks/src/extract/pipeline.test.ts
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

### packages/tasks/src/extract/pipeline.ts
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

- pass pnpm e2e:ingest (1s)

## Findings

- P2 Ingest surface changed; closeout proof is required (ingest-edge, confidence 0.95)
  - packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json:2
  - packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json is in the deterministic ingest surface. Per the ClawSweeper policy, this needs a real path read, focused gates, sibling analysis, and fixture or dogfood proof before closeout. Sibling scan noted: packages/tasks/src/extract/pipeline.ts:6, packages/tasks/src/extract/body-fallback.ts:3, packages/tasks/src/extract/swiggy-body-signals.ts:8, packages/tasks/src/extract/swiggy-llm.ts:11, packages/tasks/src/extract/pdf-extractor.ts:1, packages/tasks/src/extract/pdf-extractor-schema.ts:1, packages/tasks/src/extract/swiggy-deterministic.ts:1, packages/tasks/src/merchants/swiggy/schema.ts:14.
  - Suggested fix: Read the cited siblings, run focused extraction tests/fixtures, capture exact schemaUsed/dataSource/provenance/amount/order values, then rerun autoreview.
- P2 Ingest surface changed; closeout proof is required (ingest-edge, confidence 0.95)
  - packages/tasks/src/extract/pipeline.integration.test.ts:20
  - packages/tasks/src/extract/pipeline.integration.test.ts is in the deterministic ingest surface. Per the ClawSweeper policy, this needs a real path read, focused gates, sibling analysis, and fixture or dogfood proof before closeout. Sibling scan noted: packages/tasks/src/extract/pipeline.ts:6, packages/tasks/src/extract/body-fallback.ts:3, packages/tasks/src/extract/swiggy-body-signals.ts:8, packages/tasks/src/extract/swiggy-llm.ts:11, packages/tasks/src/extract/pdf-extractor.ts:1, packages/tasks/src/extract/pdf-extractor-schema.ts:1, packages/tasks/src/extract/swiggy-deterministic.ts:1, packages/tasks/src/merchants/swiggy/schema.ts:14.
  - Suggested fix: Read the cited siblings, run focused extraction tests/fixtures, capture exact schemaUsed/dataSource/provenance/amount/order values, then rerun autoreview.
- P2 Ingest surface changed; closeout proof is required (ingest-edge, confidence 0.95)
  - packages/tasks/src/extract/pipeline.test.ts:40
  - packages/tasks/src/extract/pipeline.test.ts is in the deterministic ingest surface. Per the ClawSweeper policy, this needs a real path read, focused gates, sibling analysis, and fixture or dogfood proof before closeout. Sibling scan noted: packages/tasks/src/extract/pipeline.ts:6, packages/tasks/src/extract/body-fallback.ts:3, packages/tasks/src/extract/swiggy-body-signals.ts:8, packages/tasks/src/extract/swiggy-llm.ts:11, packages/tasks/src/extract/pdf-extractor.ts:1, packages/tasks/src/extract/pdf-extractor-schema.ts:1, packages/tasks/src/extract/swiggy-deterministic.ts:1, packages/tasks/src/merchants/swiggy/schema.ts:14.
  - Suggested fix: Read the cited siblings, run focused extraction tests/fixtures, capture exact schemaUsed/dataSource/provenance/amount/order values, then rerun autoreview.
- P2 Ingest surface changed; closeout proof is required (ingest-edge, confidence 0.95)
  - packages/tasks/src/extract/pipeline.ts:12
  - packages/tasks/src/extract/pipeline.ts is in the deterministic ingest surface. Per the ClawSweeper policy, this needs a real path read, focused gates, sibling analysis, and fixture or dogfood proof before closeout. Sibling scan noted: packages/tasks/src/extract/pipeline.ts:6, packages/tasks/src/extract/body-fallback.ts:3, packages/tasks/src/extract/swiggy-body-signals.ts:8, packages/tasks/src/extract/swiggy-llm.ts:11, packages/tasks/src/extract/pdf-extractor.ts:1, packages/tasks/src/extract/pdf-extractor-schema.ts:1, packages/tasks/src/extract/swiggy-deterministic.ts:1, packages/tasks/src/merchants/swiggy/schema.ts:14.
  - Suggested fix: Read the cited siblings, run focused extraction tests/fixtures, capture exact schemaUsed/dataSource/provenance/amount/order values, then rerun autoreview.
