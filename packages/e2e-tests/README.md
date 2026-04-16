# E2E Tests

Playwright tests for the local slash.cash app.

Phase 1 has no sign-in flow. Tests open the dashboard directly, verify local navigation, and check `/api/healthz`.

## Run

```bash
pnpm --filter @workspace/e2e-tests test
pnpm --filter @workspace/e2e-tests e2e:phase-1
pnpm --filter @workspace/e2e-tests test:ui
pnpm --filter @workspace/e2e-tests test:headed
```

The Playwright config starts the main app automatically on `http://localhost:3000` unless one is already running.

## Environment

```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
SQLITE_DB_PATH=/tmp/slashcash-e2e/db.sqlite
```

## Notes

- Use semantic selectors such as `getByRole`, `getByLabel`, and `getByText`.
- Keep tests focused on local flows; Gmail ingestion belongs to Phase 2 scenarios.
- Run `pnpm --filter slashcash dev -- db seed` if you want deterministic data before a manual test pass.
