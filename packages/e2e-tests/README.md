# E2E Tests

End-to-end tests for Knitly using Playwright.

## Quick Start

### 1. Configure Environment

Create a `.env.local` file in `packages/e2e-tests`:

```env
TEST_USER_EMAIL=your-email@gmail.com
PLAYWRIGHT_BASE_URL=http://localhost:3000  # optional
```

### 2. One-Time Authentication Setup

Authenticate once before running tests:

```bash
# Start the app (from monorepo root)
pnpm --filter @knitly/main dev

# Run authentication setup (from packages/e2e-tests)
pnpm test:setup
```

**Follow the prompts:**
- Browser opens automatically
- Complete Google OAuth (including 2FA)
- Script detects login and saves auth state to `playwright/.auth/user.json`

**Re-authenticate when:**
- Auth expires (~1 hour)
- Testing with different account
- Auth state corrupted: `rm playwright/.auth/user.json && pnpm test:setup`

## Running Tests

```bash
pnpm test              # Run all tests (chromium, firefox, webkit)
pnpm test:ui           # UI mode (recommended)
pnpm test:headed       # See browser
pnpm test:debug        # Debug mode
pnpm test:report       # View report
pnpm test:setup        # Run auth setup (manual, run once)
```

## Writing Tests

### Authenticated Tests (Default)

```typescript
import { test, expect } from "@playwright/test";

test("should access dashboard", async ({ page }) => {
  await page.goto("/");
  // Already logged in!
});
```

### Unauthenticated Tests

```typescript
test.describe("Login Flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should show login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### Best Practices

- Use semantic selectors: `getByRole`, `getByLabel`, `getByText`
- Test user flows, not implementation
- Keep tests independent

## Troubleshooting

**Tests redirect to login:**
```bash
pnpm test:setup  # Re-authenticate
```

**Google "browser not secure" error:**
- Click "Try again" or manually navigate to Google sign-in in the same window

**App not loading after OAuth:**
- Ensure Next.js runs on `http://localhost:3000`
- Run setup in headed mode: `pnpm test:headed`

**Closed browser during auth:**
- Keep browser open until "Auth state saved" appears

## CI/CD

**Option 1: Store as CI Secret (Recommended)**

```bash
# Generate and encode auth state
pnpm playwright test --project=setup
cat playwright/.auth/user.json | base64
```

Add as `PLAYWRIGHT_AUTH_STATE` secret, then decode in CI:

```yaml
- name: Setup authentication
  run: |
    mkdir -p packages/e2e-tests/playwright/.auth
    echo "${{ secrets.PLAYWRIGHT_AUTH_STATE }}" | base64 -d > packages/e2e-tests/playwright/.auth/user.json

- name: Run tests
  run: pnpm test
```

**Option 2: Commit Auth State (Private repos only)**

⚠️ Only for private repos - contains sensitive tokens

```bash
git add -f playwright/.auth/user.json
git commit -m "Add e2e auth state for CI"
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
