# E2E Tests

`packages/e2e-tests` focuses on **customer journeys**: Playwright drives slash.cash the way a local user does. The suite seeds the local database, imports fixture Gmail receipts, starts the app through `slashcash start`, and points the assistant at a local mock OpenAI-compatible server so chat UI can stream deterministically.

Repo-wide quality gates (`pnpm test`, `pnpm fixtures:check`, `pnpm eval:gate`, `pnpm architecture-smells`, etc.) live at the monorepo root and in CI—not in this package’s scenario scripts.

## Run

```bash
pnpm e2e:journeys
pnpm --filter @workspace/e2e-tests test
pnpm --filter @workspace/e2e-tests e2e:onboarding
pnpm --filter @workspace/e2e-tests e2e:all
pnpm --filter @workspace/e2e-tests test:ui
pnpm --filter @workspace/e2e-tests test:headed
```

## Journey Coverage

- `tests/dashboard.spec.ts`: dashboard overview and main-surface navigation.
- `tests/transactions.spec.ts`: transaction review, sorting, and receipt viewer flow.
- `tests/assistant-feedback.spec.ts`: assistant chat flow plus in-app feedback submission.

## Journey Harness

- The Playwright suite never reuses a random local dev server.
- The app is started through `slashcash start`, not `next dev`, so the UI suite exercises the same boot path a customer uses.
- Fixture sync keeps the PDF viewer deterministic without requiring a real Gmail account.
- The assistant uses a local mock OpenAI-compatible server so the journey suite can assert chat streaming without a real Ollama daemon.
