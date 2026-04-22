# E2E Tests

`packages/e2e-tests` now has two complementary layers:

- Customer journeys: Playwright drives slash.cash the way a local user does. The suite seeds the local database, imports one fixture Gmail receipt, starts the app through `slashcash start`, and points the assistant at a local mock Ollama server so chat UI can stream deterministically.
- Phase gates: the `scenarios/phase-*.ts` scripts remain the roadmap acceptance checks for CLI setup, sync, onboarding resilience, quality gates, and release smoke.

## Run

```bash
pnpm e2e:journeys
pnpm --filter @workspace/e2e-tests test
pnpm --filter @workspace/e2e-tests e2e:phase-1
pnpm --filter @workspace/e2e-tests e2e:phase-2
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

## Phase Aliases

These friendly aliases point at the existing roadmap gate scripts:

```bash
pnpm --filter @workspace/e2e-tests journey:boot-local-app
pnpm --filter @workspace/e2e-tests journey:sync-inbox-and-receipts
pnpm --filter @workspace/e2e-tests journey:onboard-recovery
pnpm --filter @workspace/e2e-tests journey:quality-gates
pnpm --filter @workspace/e2e-tests journey:release-readiness
```
