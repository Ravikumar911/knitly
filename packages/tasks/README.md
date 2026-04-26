# @workspace/tasks

Local ingestion and extraction helpers for slash.cash.

This package owns local Gmail ingest, attachment handling, deterministic Swiggy extraction, and the in-process sync worker. Swiggy transaction extraction must not import or call chat models; AI is reserved for the dashboard assistant.

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
