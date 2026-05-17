# @workspace/evals

Local evaluation scripts for release gates.

Swiggy ingest is deterministic now, so the release eval gate is a lightweight placeholder until a new assistant-specific eval suite is added.

## Setup

```bash
pnpm install
```

## Commands

```bash
pnpm --filter @workspace/evals eval
```

## Current Gate

`src/eval-gate.ts` verifies that the eval package is wired into the monorepo and exits successfully. Deterministic Swiggy correctness lives in the PDF extractor golden tests, the task pipeline tests, and the fixture-backed E2E ingest scenario.

## Adding Evals

1. Add fixtures under `src/fixtures` when model output needs scored.
2. Add expected output data.
3. Add scorers under `src/scorers` when exact matching is not enough.
4. Add a `*.eval.ts` script and package script.
