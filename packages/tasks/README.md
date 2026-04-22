# @workspace/tasks

Local ingestion and extraction helpers for slash.cash.

Phase 1 keeps this package compile-safe without hosted job infrastructure. Email sync exports are local stubs that mark sync status and return deterministic messages. Gmail ingestion, attachment retrieval, and richer scheduling arrive in Phase 2.

## Commands

```bash
pnpm --filter @workspace/tasks build
pnpm --filter @workspace/tasks dev
```

## Local AI

Extraction uses an OpenAI-compatible local endpoint:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_CHAT_MODEL=gemma3n:e4b
```

## Exports

- `trigger/processEmails`: Phase 1 local sync placeholder.
- `trigger/duplicateDetector`: deterministic no-op duplicate scan.
- `agents/slashAIV2`: Swiggy extraction helper.
- `merchants/*`: merchant prompt and schema definitions.
