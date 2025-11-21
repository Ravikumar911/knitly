# E2E Tests

End-to-end tests for the Knitly monorepo using Playwright.

## Setup

Install dependencies:

```bash
pnpm install
```

Install Playwright browsers:

```bash
pnpm exec playwright install
```

## Running Tests

Run all tests:

```bash
pnpm test
```

Run tests in UI mode:

```bash
cd packages/e2e-tests
pnpm test:ui
```

Run tests in headed mode (see browser):

```bash
pnpm test:headed
```

Debug tests:

```bash
pnpm test:debug
```

View test report:

```bash
pnpm test:report
```

## Writing Tests

Use the standard Playwright test import:

```ts
import { test, expect } from "@playwright/test";

test("example test", async ({ page }) => {
  await page.goto("/login");
  // Test your page
});
```

## Configuration

Tests are configured in `playwright.config.ts`. The configuration:

- Automatically starts the main application (`@knitly/main`) before running tests
- Supports Chromium, Firefox, and WebKit browsers

## Best Practices

- Use descriptive test names
- Use page object models for complex pages
- Keep tests independent and isolated
- Use appropriate selectors (prefer `data-testid` or role-based selectors)
