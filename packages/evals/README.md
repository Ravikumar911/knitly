# @workspace/evals

Local evaluation scripts for extraction quality.

Phase 1 runs evals from the terminal and talks to the same Ollama-compatible endpoint as the app.

## Setup

```bash
pnpm install
cp packages/evals/.env.example packages/evals/.env.local
```

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_CHAT_MODEL=gemma4:latest
```

## Commands

```bash
pnpm --filter @workspace/evals eval
pnpm --filter @workspace/evals eval:swiggy
```

## Swiggy Extraction Eval

The Swiggy eval loads ten sample PDF invoices from `packages/evals/test-data`, calls `extractEmailData`, and scores:

- Parse success
- Order ID
- Amount
- Restaurant name
- Order item count and matches
- Delivery address presence
- Currency and transaction type
- Swiggy service metadata
- Confidence score

Expected outputs live in `src/fixtures/swiggy-expected.ts`.

## Adding Evals

1. Add fixtures under `src/fixtures`.
2. Add expected output data.
3. Add scorers under `src/scorers` when exact matching is not enough.
4. Add a `*.eval.ts` script and package script.
