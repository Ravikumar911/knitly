# E2E Testing App

This is a dedicated e2e testing application for the Knitly monorepo using [Playwright](https://playwright.dev/). It tests multiple applications within the monorepo from a centralized location, following industry best practices for monorepo e2e testing.

## 🎯 Overview

This app is responsible for:
- Testing the main application (`apps/main`) running on port 3000
- Testing the marketing website (`apps/website`) running on port 3001
- Providing shared utilities and patterns for all e2e tests
- Running in CI/CD pipelines for comprehensive integration testing

## 🚀 Getting Started

### Installation

From the e2e app directory:

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm run install-browsers
```

From the monorepo root:

```bash
# Install all dependencies including e2e
pnpm install

# Install Playwright browsers for e2e
pnpm --filter e2e run install-browsers
```

### Running Tests

**From the e2e app directory (`apps/e2e/`):**

```bash
# Run all tests (starts dev servers automatically)
pnpm test

# Run with UI mode (interactive)
pnpm test:ui

# Run in headed mode (see browser)
pnpm test:headed

# Debug tests (step through)
pnpm test:debug

# Run only main app tests
pnpm test:main

# Run only website tests
pnpm test:website
```

**From the monorepo root:**

```bash
# Run all e2e tests
pnpm --filter e2e test

# Using turbo (recommended)
pnpm turbo test:e2e
```

## 📁 Project Structure

```
apps/e2e/
├── tests/
│   ├── main/                 # Tests for apps/main
│   │   ├── auth.spec.ts      # Authentication flow tests
│   │   └── dashboard.spec.ts # Dashboard functionality tests
│   ├── website/              # Tests for apps/website
│   │   ├── pages.spec.ts     # Marketing page tests
│   │   └── seo.spec.ts       # SEO and performance tests
│   └── utils/
│       └── test-helpers.ts   # Shared utilities
├── playwright.config.ts      # Playwright configuration
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md               # This file
```

## 🧪 Test Organization

### Test Categories

Tests are organized by application and tagged appropriately:

- **Main App Tests** (`@main`): Authentication, dashboard, user flows
- **Website Tests** (`@website`): Marketing pages, SEO, responsive design

### Shared Utilities

The `tests/utils/test-helpers.ts` file contains reusable functions:

- `waitForPageLoad()`: Wait for page to fully load
- `takeScreenshot()`: Take meaningful screenshots
- `expectPageUrl()`: Verify URL patterns
- `expectPageTitle()`: Verify page titles
- `expectElementVisible()`: Check element visibility
- `fillFormField()`: Fill and verify form fields
- `testResponsive()`: Test responsive design across viewports

## 🔧 Configuration

### Multi-App Testing

The Playwright configuration supports testing multiple applications:

```typescript
// Each app has its own project configuration
{
  name: 'main-app-chromium',
  use: { baseURL: 'http://localhost:3000' },
  testMatch: '**/main/**/*.spec.ts',
}
```

### Development Servers

Tests automatically start the required development servers:

```typescript
webServer: [
  {
    command: 'pnpm --filter main dev',
    url: 'http://localhost:3000',
  },
  {
    command: 'pnpm --filter website dev', 
    url: 'http://localhost:3001',
  },
]
```

### Browser Configuration

Tests run across multiple browsers and viewports:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome on Pixel 5
- **Responsive**: Automatic testing across different screen sizes

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForPageLoad, takeScreenshot } from '../utils/test-helpers';

test.describe('Feature Name', () => {
  test('should do something @main', async ({ page }) => {
    await page.goto('/some-page');
    await waitForPageLoad(page);
    
    // Your test assertions here
    await expect(page.locator('h1')).toBeVisible();
    
    await takeScreenshot(page, 'feature-screenshot');
  });
});
```

### Best Practices

1. **Use Tags**: Tag tests with `@main` or `@website` for selective running
2. **Descriptive Names**: Use clear, descriptive test names
3. **Group Related Tests**: Use `test.describe()` for logical grouping
4. **Wait for Loads**: Always use `waitForPageLoad()` after navigation
5. **Take Screenshots**: Useful for debugging and visual verification
6. **Test User Journeys**: Focus on complete workflows, not just individual components

## 🐛 Debugging

### Visual Debugging

```bash
# Interactive UI mode
pnpm test:ui

# See browser while running
pnpm test:headed

# Step through tests
pnpm test:debug
```

### Reports and Artifacts

After test runs:
- HTML reports: `playwright-report/`
- Screenshots: `test-results/screenshots/`
- Video recordings: `test-results/`
- Traces: Available for failed tests

View the HTML report:
```bash
pnpm dlx playwright show-report
```

## 📊 CI/CD Integration

### Environment Configuration

Tests are optimized for CI environments:
- **Retries**: 2 retries on CI, 0 locally
- **Workers**: 1 worker on CI, parallel locally
- **Browsers**: Configurable per environment

### Running in CI

```bash
# Basic CI command
pnpm turbo test:e2e

# With specific browser
pnpm --filter e2e test -- --project=main-app-chromium
```

## 🎯 Current Test Coverage

### Main App (`@main`)
- ✅ Authentication flows (login, register, redirects)
- 🔄 Dashboard functionality (planned)
- 🔄 User settings (planned)

### Website (`@website`)
- ✅ Marketing pages (home, privacy, terms)
- ✅ Responsive design testing
- 🔄 SEO and performance (planned)

## 🚀 Extending Tests

### Adding New Tests

1. Create test files in appropriate app directory (`tests/main/` or `tests/website/`)
2. Use appropriate tags (`@main` or `@website`)
3. Import shared utilities from `tests/utils/test-helpers`
4. Follow existing naming conventions

### Adding New Apps

1. Update `playwright.config.ts` with new project configuration
2. Add new web server configuration if needed
3. Create new test directory (`tests/new-app/`)
4. Update this README with new test categories

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen): Generate tests by recording interactions
- [Monorepo Testing Patterns](https://turbo.build/repo/docs/handbook/testing)