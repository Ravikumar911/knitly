# E2E Testing for Main App

This package contains end-to-end tests for the main application using [Playwright](https://playwright.dev/).

## 🚀 Getting Started

### Prerequisites

Make sure the main app is running on `http://localhost:3000`:

```bash
# From the monorepo root
pnpm --filter main dev
```

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm run install-browsers
```

## 🧪 Running Tests

### Development

```bash
# Run all tests
pnpm test

# Run tests with UI mode (interactive)
pnpm test:ui

# Run tests in headed mode (see browser)
pnpm test:headed

# Debug tests (step through)
pnpm test:debug
```

### From Monorepo Root

```bash
# Run e2e tests for main app
pnpm --filter e2e-main test

# Using turbo
pnpm turbo test:e2e
```

## 📁 Test Structure

```
tests/
├── auth.spec.ts           # Authentication flow tests
├── utils/
│   └── test-helpers.ts    # Shared utilities
└── ...                    # Other test files
```

## 🔧 Configuration

- **Target URL**: `http://localhost:3000` (main app)
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: Taken on failure
- **Traces**: Collected on retry

## 📊 Reports

After running tests, view the HTML report:

```bash
pnpm run report
```

## 🎯 Writing Tests

1. Tests should be focused on user flows and critical paths
2. Use descriptive test names that explain the expected behavior
3. Leverage the utility functions in `utils/test-helpers.ts`
4. Take screenshots for visual verification
5. Test across different viewport sizes when relevant

## 🚀 CI/CD

Tests run automatically on pull requests via GitHub Actions. The CI environment:
- Builds the main app first
- Starts the app on port 3000
- Runs tests against the built application
- Uploads test reports and screenshots as artifacts