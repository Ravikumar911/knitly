# @workspace/tasks

Local ingestion and extraction helpers for slash.cash.

This package owns local Gmail ingest, attachment handling, deterministic Swiggy extraction, and the in-process sync worker. Swiggy transaction extraction must not import or call chat models; AI is reserved for the dashboard assistant.

## Agentic review expectations

Extraction changes must follow the root `AGENTS.md` ClawSweeper-Style Review Policy. Before landing changes under `src/extract/**`, cite sibling analysis across the deterministic pipeline, then cite fixture roundtrip or dogfood proof with exact values for fields such as `schemaUsed`, `dataSource`, provenance, amounts, items, order IDs, and warnings.

The active adoption plan in `packages/docs/roadmap/agentic-coding-adoption.md` now provides `.agents/skills/autoreview` and `.agents/skills/ingest-proof`. Use `pnpm e2e:ingest` to collect the committed-fixture proof bundle, then include the evidence map and proof summary in the PR or scratch log until Phase 5 scenarios ship.

## Commands

```bash
pnpm --filter @workspace/tasks build
pnpm --filter @workspace/tasks dev
```

## Exports

- `trigger/processEmails`: local IMAP sync runner.
- `trigger/duplicateDetector`: deterministic no-op duplicate scan.
- `extract/*`: PDF/body extraction and Swiggy deterministic pipeline.
- `merchants/*`: merchant prompt and schema definitions.
