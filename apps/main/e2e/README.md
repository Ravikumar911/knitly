# E2E Testing with Playwright

This directory contains end-to-end tests for the main application using [Playwright](https://playwright.dev/).

## 🚀 Getting Started

### Installation

First, install the dependencies and Playwright browsers:

```bash
# Install dependencies (from the main app directory)
pnpm install

# Install Playwright browsers
pnpm dlx playwright install
```

### Running Tests

From the main app directory (`apps/main/`):

```bash
# Run all e2e tests
pnpm test:e2e

# Run tests with UI mode (interactive)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests (step through)
pnpm test:e2e:debug
```

From the root of the monorepo:

```bash
# Run e2e tests for main app
pnpm --filter main test:e2e

# Using turbo (runs for all apps that have e2e tests)
pnpm turbo test:e2e
```

## 📁 Project Structure

```
e2e/
├── auth.spec.ts              # Authentication flow tests
├── setup/
│   └── global-setup.ts       # Global test setup
├── utils/
│   └── test-helpers.ts       # Reusable test utilities
├── screenshots/              # Test screenshots (gitignored)
└── README.md                 # This file
```

## 🧪 Test Organization

### Test Files

- **`auth.spec.ts`**: Tests for authentication flows (login, register, redirects)
- More test files can be added following the `*.spec.ts` pattern

### Utilities

The `utils/test-helpers.ts` file contains reusable functions:

- `waitForPageLoad()`: Wait for page to fully load
- `takeScreenshot()`: Take meaningful screenshots
- `expectPageUrl()`: Verify URL patterns
- `expectPageTitle()`: Verify page titles
- `expectElementVisible()`: Check element visibility
- `fillFormField()`: Fill and verify form fields
- `clickAndWaitForNavigation()`: Click and wait for navigation

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForPageLoad, takeScreenshot } from './utils/test-helpers';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    await waitForPageLoad(page);
    
    // Your test assertions here
    await expect(page.locator('h1')).toBeVisible();
    
    await takeScreenshot(page, 'feature-screenshot');
  });
});
```

### Best Practices

1. **Use descriptive test names**: `should display login form correctly`
2. **Group related tests**: Use `test.describe()` for logical grouping
3. **Wait for page loads**: Always use `waitForPageLoad()` after navigation
4. **Take screenshots**: Useful for debugging and visual verification
5. **Use utility functions**: Leverage the helper functions for common operations
6. **Test user journeys**: Focus on complete user workflows, not just individual components

## 🔧 Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Global Setup**: Ensures dev server is ready before tests
- **Screenshots**: Taken on test failures
- **Traces**: Recorded on first retry for debugging

## 🐛 Debugging

### Visual Debugging

```bash
# Run with UI mode for interactive debugging
pnpm test:e2e:ui

# Run in headed mode to see the browser
pnpm test:e2e:headed

# Debug mode (step through tests)
pnpm test:e2e:debug
```

### Screenshots and Traces

- Screenshots are automatically taken on failures
- Traces are recorded on first retry
- Both are saved in `test-results/` directory

### Viewing Reports

After test runs, view the HTML report:

```bash
pnpm dlx playwright show-report
```

## 🔐 Authentication Testing

For tests that require authentication:

1. **Mock Authentication**: Use test users or mock auth states
2. **Test Flows**: Test the actual login/logout flows
3. **Protected Routes**: Verify redirect behavior for authenticated/unauthenticated users

## 📊 CI/CD Integration

The tests are configured to run in CI environments:

- **Retries**: 2 retries on CI, 0 locally
- **Workers**: 1 worker on CI, parallel locally
- **Browser**: Only Chromium on CI (add more as needed)

## 🎯 Current Test Coverage

- ✅ Login page loads correctly
- ✅ Home page redirects appropriately
- ✅ Register page is accessible
- 🔄 More tests to be added...

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen): `pnpm dlx playwright codegen`