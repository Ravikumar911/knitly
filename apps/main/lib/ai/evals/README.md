# Assistant Evaluation & Regression Testing

This directory contains the regression testing system for the slash.cash assistant.

## Goals

- Catch regressions when changing prompts, tools, models, or instructions
- Provide visibility into tool-calling behavior (trajectories)
- Support iterative improvement with real multi-turn test cases

## Key Files

- `golden-dataset.ts` — The canonical set of test cases (expand this over time)
- `assistant-regression.test.ts` — Vitest snapshot tests on tool trajectories (run in CI)
- `run-assistant-eval.ts` — Full evaluation runner with optional LLM-as-Judge scoring
- `scoring.ts` — Simple LLM-as-Judge implementation

## Running Locally

```bash
# Run the full evaluation with scoring
pnpm --filter @knitly/main eval:assistant

# Run only the regression snapshot tests
pnpm --filter @knitly/main test -- lib/ai/evals/assistant-regression.test.ts
```

## Updating Snapshots

When you intentionally improve behavior, update the snapshots:

```bash
pnpm --filter @knitly/main test -- lib/ai/evals/assistant-regression.test.ts -u
```

Then commit the new snapshots.

## Adding New Test Cases

1. Add entries to `golden-dataset.ts`
2. (Optional) Add specific expectations
3. Run the eval
4. Review and commit new snapshots if behavior is correct

## CI Integration

The regression tests run on every PR (see `.github/workflows/pr.yml`).
They are currently set to `continue-on-error` until a stable assistant provider is available in CI.

## Best Practices

- Keep the golden dataset focused on high-signal edge cases and real user patterns
- When a production failure occurs, add it as a new test case immediately
- Prefer snapshotting tool trajectories over exact final text (more stable)
- Use low temperature (0) for regression runs
