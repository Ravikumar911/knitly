# E2E Tests

End-to-end tests for Knitly using Playwright.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create a `.env.local` file in the `packages/e2e-tests` directory:

```env
# Your Google account email for testing (used for verification)
TEST_USER_EMAIL=your-email@gmail.com

# Base URL (optional, defaults to http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### 3. One-Time Authentication Setup

**Important:** You need to manually authenticate once before running tests.

1. **Ensure the main app is running:**
   ```bash
   # From the monorepo root
   pnpm --filter @knitly/main dev
   ```

2. **Run the authentication setup:**
   ```bash
   cd packages/e2e-tests
   pnpm playwright test --project=setup
   ```

3. **Follow the prompts:**
   - A browser window will open
   - Click "Continue with Google"
   - Complete Google OAuth authentication (including 2FA if enabled)
   - The script will automatically detect when you're logged in
   - Authentication state will be saved to `playwright/.auth/user.json`

**Note:** This only needs to be done once. The authentication state will be reused for all subsequent test runs.

### 4. When to Re-authenticate

Re-run the setup if:
- Authentication state expires (tokens typically valid for ~1 hour)
- You need to test with a different Google account
- The saved auth state is deleted or corrupted

```bash
pnpm playwright test --project=setup
```

## Running Tests

**Prerequisites:** You must run the authentication setup first (see step 3 above).

```bash
# Run all tests (after authentication setup)
pnpm test

# Run tests in UI mode (recommended for development)
pnpm test:ui

# Run tests in headed mode (see browser)
pnpm test:headed

# Debug tests
pnpm test:debug

# View test report
pnpm test:report

# Run only authenticated tests
pnpm playwright test tests/authenticated.spec.ts

# Run only unauthenticated tests
pnpm playwright test tests/unauthenticated.spec.ts
```

## How Authentication Works

### Authentication Setup

The authentication setup uses Playwright's [authentication best practices](https://playwright.dev/docs/auth):

1. **Manual Setup (`auth.setup.ts`)**:
   - Run once manually with `pnpm playwright test --project=setup`
   - Opens a browser for manual Google OAuth authentication
   - Handles 2FA, CAPTCHA, and security checks automatically
   - Saves the authenticated session to `playwright/.auth/user.json`
   - This file is git-ignored (contains sensitive auth tokens)
   
2. **Test Execution**:
   - All test projects (chromium, firefox, webkit) reuse the saved authentication state
   - Tests run as the authenticated Google user
   - No need to log in for each test run
   - Auth state is valid for ~1 hour (Google OAuth token expiry)

### Test Types

#### Authenticated Tests
Most tests should use the default authentication state:

```typescript
import { test, expect } from "@playwright/test";

test("should access dashboard", async ({ page }) => {
  await page.goto("/");
  // Already logged in!
});
```

#### Unauthenticated Tests
To test flows that require being logged out:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  // Override to not use auth state - use undefined to clear storage
  test.use({ storageState: undefined });

  test("should show login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

## Writing Tests

### Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Test user flows, not implementation**: Focus on what users do, not how the app works internally
3. **Keep tests independent**: Each test should be able to run in isolation
4. **Use page objects** for complex interactions (create in `tests/pages/` directory)

### Example Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Setup common to all tests in this describe block
    await page.goto("/");
  });

  test("should do something", async ({ page }) => {
    // Arrange
    await page.getByRole("button", { name: "Click me" }).click();
    
    // Act
    await page.getByRole("textbox").fill("test input");
    
    // Assert
    await expect(page.getByText("Success")).toBeVisible();
  });
});
```

## Troubleshooting

### "Authentication state not found" or tests redirecting to login
1. **Run the authentication setup first:**
   ```bash
   pnpm playwright test --project=setup
   ```
2. **Check if auth state file exists:**
   ```bash
   ls -la playwright/.auth/user.json
   ```
3. **Auth tokens might be expired** - Re-run setup to get fresh tokens

### "Google shows 'browser not secure' error"
This is expected with automated browsers. Solutions:
1. Click "Try again" on the error page
2. Or manually navigate to Google sign-in in the same browser window
3. The script will automatically detect successful login

### "Authentication verification failed: sidebar not visible"
The OAuth completed but the app didn't load properly:
1. Ensure the Next.js app is running on `http://localhost:3000`
2. Check browser console for errors
3. Try running setup again in headed mode

### Tests fail with "Target page, context or browser has been closed"
You closed the browser during manual authentication:
1. Keep the browser window open during the manual auth process
2. The script will automatically detect login and close the browser
3. Don't manually close the browser until you see "Auth state saved"

### Tests are slow or flaky
- Run tests in headed mode to see what's happening: `pnpm test:headed`
- Check the Playwright trace: Tests automatically create traces on first retry
- Increase timeouts if needed in `playwright.config.ts`

### Need to test with a different Google account
1. Delete the current auth state:
   ```bash
   rm playwright/.auth/user.json
   ```
2. Re-run the setup:
   ```bash
   pnpm playwright test --project=setup
   ```
3. Authenticate with the new account

## CI/CD

Running E2E tests in CI with Google OAuth requires special considerations:

### Option 1: Use Saved Authentication State (Recommended for private repos)

1. **Generate auth state locally:**
   ```bash
   pnpm playwright test --project=setup
   ```

2. **Commit the auth state** (for private repos only):
   ```bash
   git add -f playwright/.auth/user.json
   git commit -m "Add e2e auth state for CI"
   ```
   
   ⚠️ **Warning:** Only do this in private repositories. The file contains sensitive tokens.

3. **In CI, tests will use the committed auth state:**
   ```bash
   pnpm test
   ```

### Option 2: Store as CI Secret (More secure)

1. **Generate auth state and encode it:**
   ```bash
   pnpm playwright test --project=setup
   cat playwright/.auth/user.json | base64
   ```

2. **Add as CI secret:**
   - Create a secret named `PLAYWRIGHT_AUTH_STATE`
   - Set value to the base64-encoded auth state

3. **In CI workflow, decode before tests:**
   ```yaml
   - name: Setup authentication
     run: |
       mkdir -p packages/e2e-tests/playwright/.auth
       echo "${{ secrets.PLAYWRIGHT_AUTH_STATE }}" | base64 -d > packages/e2e-tests/playwright/.auth/user.json
   
   - name: Run tests
     run: pnpm test
   ```

### Option 3: Use Service Account (Enterprise)

For production CI/CD, consider using a dedicated service account with stable credentials.

**Note:** The configuration automatically adjusts for CI (enables retries, disables parallelization, etc.).

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
