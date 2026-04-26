# @workspace/tasks

Local ingestion and extraction helpers for slash.cash.

This package owns local Gmail ingest, attachment handling, deterministic Swiggy extraction, and the in-process sync worker. Swiggy transaction extraction should not require a chat model; AI is reserved for the dashboard assistant and optional experiments.

## Commands

```bash
pnpm --filter @workspace/tasks build
pnpm --filter @workspace/tasks dev
```

## Assistant AI

Assistant features can use an OpenAI-compatible local endpoint:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_CHAT_MODEL=gemma4:latest
```

## Exports

- `trigger/processEmails`: local IMAP sync runner.
- `trigger/duplicateDetector`: deterministic no-op duplicate scan.
- `extract/*`: PDF/body extraction and Swiggy deterministic pipeline.
- `merchants/*`: merchant prompt and schema definitions.
