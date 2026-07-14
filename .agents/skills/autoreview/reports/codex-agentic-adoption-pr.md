# Autoreview Report

- Generated: 2026-06-14T03:58:37.417Z
- Branch: codex/agentic-adoption-ingest-proof
- Base ref: origin/main
- Status: clean
- Actionable findings: 0

## Dirty Scope

- A  .agents/skills/autoreview/SKILL.md
- A  .agents/skills/autoreview/reports/.gitignore
- A  .agents/skills/autoreview/reports/phase-3-final-clean.json
- A  .agents/skills/autoreview/reports/phase-3-final-clean.md
- A  .agents/skills/autoreview/reports/phase-3-verify-final-rerun.json
- A  .agents/skills/autoreview/reports/phase-3-verify-final-rerun.md
- A  .agents/skills/autoreview/reports/phase-3-verify-final.json
- A  .agents/skills/autoreview/reports/phase-3-verify-final.md
- A  .agents/skills/autoreview/reports/phase-3-verify.json
- A  .agents/skills/autoreview/reports/phase-3-verify.md
- A  .agents/skills/autoreview/reports/phase-4-orchestrated-clean.json
- A  .agents/skills/autoreview/reports/phase-4-orchestrated-clean.md
- A  .agents/skills/autoreview/reports/phase6-handoff-final-closeout.json
- A  .agents/skills/autoreview/reports/phase6-handoff-final-closeout.md
- A  .agents/skills/autoreview/reports/phase6-qa-handoff-closeout.json
- A  .agents/skills/autoreview/reports/phase6-qa-handoff-closeout.md
- A  .agents/skills/autoreview/reports/post-phase4-5-subagent-verif-fixed.json
- A  .agents/skills/autoreview/reports/post-phase4-5-subagent-verif-fixed.md
- A  .agents/skills/autoreview/reports/post-phase4-5-subagent-verif.json
- A  .agents/skills/autoreview/reports/post-phase4-5-subagent-verif.md
- A  .agents/skills/autoreview/reports/review-reverify-clean.json
- A  .agents/skills/autoreview/reports/review-reverify-clean.md
- A  .agents/skills/autoreview/scripts/autoreview
- A  .agents/skills/autoreview/scripts/autoreview.mjs
- A  .agents/skills/autoreview/scripts/self-test.mjs
- A  .agents/skills/ingest-edge-sweep/SKILL.md
- A  .agents/skills/ingest-proof/SKILL.md
- A  .agents/skills/ingest-proof/reports/.gitignore
- AM .agents/skills/ingest-proof/reports/latest/real-behavior-proof.json
- AM .agents/skills/ingest-proof/reports/latest/real-behavior-proof.md
- A  .agents/skills/orchestrator/SKILL.md
- A  .agents/skills/orchestrator/reports/.gitignore
- A  .agents/skills/orchestrator/reports/latest/orchestrator-run.json
- A  .agents/skills/orchestrator/reports/latest/orchestrator-run.md
- A  .agents/skills/orchestrator/reports/phase-4-live-cycle.json
- A  .agents/skills/orchestrator/reports/phase-4-live-cycle.md
- A  .agents/skills/orchestrator/reports/phase-4-wake-sim.json
- A  .agents/skills/orchestrator/reports/phase-4-wake-sim.md
- A  .agents/skills/orchestrator/scripts/orchestrator
- A  .agents/skills/orchestrator/scripts/orchestrator.mjs
- M  .agents/skills/playwright-best-practices/SKILL.md
- M  .agents/skills/run-tests/SKILL.md
- M  .github/workflows/pr.yml
- A  AGENTIC-ADOPTION-PROOF.md
- M  AGENTS.md
- M  apps/main/AGENTS.md
- M  package.json
- M  packages/docs/README.md
- M  packages/docs/current-state.md
- M  packages/docs/reference/testing.md
- A  packages/docs/roadmap/agentic-coding-adoption.md
- M  packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json
- M  packages/e2e-tests/package.json
- A  packages/e2e-tests/scripts/real-behavior-proof.ts
- M  packages/e2e-tests/tests/assistant-feedback.spec.ts
- M  packages/tasks/README.md
- M  packages/tasks/src/extract/pipeline.integration.test.ts
- M  packages/tasks/src/extract/pipeline.test.ts
- M  packages/tasks/src/extract/pipeline.ts
- A  qa/README.md
- A  qa/scenarios.md
- A  qa/scenarios/index.md
- A  qa/scenarios/ingest/food-delivery-edges.md
- A  qa/scenarios/ingest/replays/pdf-vs-body.jsonl

## Committed Scope

None

## Ingest Changes

- packages/e2e-tests/fixtures/imap/swiggy-order-with-pdf.expected.json
- packages/tasks/src/extract/pipeline.integration.test.ts
- packages/tasks/src/extract/pipeline.test.ts
- packages/tasks/src/extract/pipeline.ts
- qa/scenarios/ingest/food-delivery-edges.md
- qa/scenarios/ingest/replays/pdf-vs-body.jsonl

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

- pass pnpm e2e:ingest (1s)

## Findings

No actionable findings.
