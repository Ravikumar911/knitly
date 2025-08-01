# E2E Testing Setup

This directory contains end-to-end tests for the Knitly application using Playwright, with comprehensive mocking of external services including trigger.dev, database, and authentication.

## Getting Started

### 1. Install Dependencies

```bash
cd apps/e2e-main
npm install

# Install Playwright browsers
npm run install:browsers
```

### 2. Environment Setup

The tests use the `.env.test` file for configuration. The default values should work for local testing, but you can modify them if needed:

```bash
# Copy and modify if needed
cp .env.test .env.test.local
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests with UI (interactive mode)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Debug specific test
npm run test:debug -- tests/auth.spec.ts

# View test results
npm run test:report
```

## Architecture

### Mock Services

The test environment includes mock servers for:

1. **Trigger.dev Server** (Port 3001)
   - Mocks task execution and responses
   - Handles batch processing simulation
   - Provides webhook endpoints

2. **Gmail API Mock** (Port 3002)
   - Simulates email fetching
   - Provides mock email data
   - Handles pagination and search

3. **OpenAI API Mock** (Port 3003)
   - Mocks AI transaction extraction
   - Returns configurable responses
   - Simulates various processing scenarios

### Database

Tests use an in-memory SQLite database that:
- Recreates schema for each test run
- Includes sample test data
- Provides isolation between tests
- Matches production PostgreSQL schema

### Authentication

Authentication is mocked using:
- Fake JWT tokens for session management
- Supabase client interception
- OAuth flow simulation
- Session persistence testing

## Test Structure

```
apps/e2e-main/
├── tests/           # Test files
│   ├── auth.spec.ts        # Authentication tests
│   ├── setup.spec.ts       # Infrastructure tests
│   └── ...                 # Additional test files
├── utils/           # Test utilities
│   └── test-helpers.ts     # Common test functions
├── mocks/           # Mock implementations
│   ├── auth.ts             # Authentication mocks
│   └── ...                 # Additional mocks
├── setup/           # Test infrastructure
│   ├── global-setup.ts     # Global test setup
│   ├── global-teardown.ts  # Global test cleanup
│   ├── mock-servers.ts     # Mock server management
│   └── test-database.ts    # Database setup
└── playwright.config.ts    # Playwright configuration
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { createTestHelpers, SELECTORS } from '../utils/test-helpers';
import { createAuthMock, createMockUser } from '../mocks/auth';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    const helpers = createTestHelpers(page);
    const authMock = createAuthMock(page);
    
    // Setup authentication if needed
    const session = await authMock.mockSuccessfulLogin();
    await authMock.setAuthenticatedSession(session);
    
    // Navigate and interact
    await helpers.navigateTo('/dashboard');
    await helpers.clickAndWait(SELECTORS.SYNC_BUTTON);
    
    // Assertions
    await expect(page.getByText('Sync completed')).toBeVisible();
  });
});
```

### Authentication Setup

```typescript
// For tests requiring authentication
test.beforeEach(async ({ page }) => {
  const authMock = createAuthMock(page);
  const session = await authMock.mockSuccessfulLogin();
  await authMock.setAuthenticatedSession(session);
});
```

### API Mocking

```typescript
// Mock specific API responses
await helpers.mockApiResponse(/\/api\/transactions/, {
  transactions: [
    { id: '1', amount: 100, description: 'Test transaction' }
  ]
});

// Mock API errors
await helpers.mockApiError(/\/api\/sync/, 500, 'Sync failed');
```

### Database State

```typescript
// The test database is automatically reset between tests
// No manual cleanup needed, but you can add specific test data if needed
```

## Available Test Utilities

### TestHelpers Class

- `navigateTo(path)` - Navigate to page and wait for load
- `waitForElement(selector)` - Wait for element to be visible
- `clickAndWait(selector, options)` - Click and wait for response/navigation
- `waitForText(text)` - Wait for specific text to appear
- `waitForLoading()` - Wait for loading states to complete
- `takeScreenshot(name)` - Take debug screenshots
- `mockApiResponse(pattern, response)` - Mock API calls
- `clearBrowserState()` - Clear storage and cookies

### SELECTORS Constants

Pre-defined selectors for common UI elements:
- Authentication: `GOOGLE_LOGIN_BUTTON`, `LOGOUT_BUTTON`
- Navigation: `DASHBOARD_LINK`, `TRANSACTIONS_LINK`
- Dashboard: `SYNC_BUTTON`, `ANALYTICS_CARDS`
- Common: `LOADING_SPINNER`, `ERROR_MESSAGE`

### AuthMock Class

- `mockSuccessfulLogin(user)` - Mock successful authentication
- `mockGoogleOAuth(user)` - Mock OAuth flow
- `mockAuthFailure(message)` - Mock authentication errors
- `setAuthenticatedSession(session)` - Set browser session state
- `clearAuthState()` - Clear authentication

## Test Data

### Mock Users

```typescript
const mockUser = createMockUser({
  id: 'custom-user-id',
  email: 'custom@example.com',
  name: 'Custom User'
});
```

### Sample Transactions

The test database includes sample transactions:
- Swiggy food order (₹299)
- Instamart grocery (₹150)

## Debugging

### Visual Debugging

```bash
# Run with browser visible
npm run test:headed

# Use Playwright inspector
npm run test:debug

# View test artifacts
npm run test:report
```

### Screenshots

Tests automatically take screenshots on failure. Manual screenshots:

```typescript
await helpers.takeScreenshot('debug-state');
```

### Console Logs

Monitor browser console:

```typescript
page.on('console', msg => console.log('Browser:', msg.text()));
```

## Common Patterns

### Testing User Flows

```typescript
test('complete user onboarding flow', async ({ page }) => {
  const helpers = createTestHelpers(page);
  const authMock = createAuthMock(page);
  
  // 1. Login
  await authMock.mockGoogleOAuth();
  await helpers.navigateTo('/login');
  await helpers.clickAndWait(SELECTORS.GOOGLE_LOGIN_BUTTON);
  
  // 2. Sync emails
  await helpers.clickAndWait(SELECTORS.SYNC_BUTTON);
  await helpers.waitForText('Sync completed');
  
  // 3. View transactions
  await helpers.navigateTo('/dashboard/transactions');
  await helpers.waitForElement(SELECTORS.TRANSACTION_TABLE);
  
  // 4. Verify data
  await expect(page.getByText('₹299')).toBeVisible();
});
```

### Error Scenarios

```typescript
test('handles sync errors gracefully', async ({ page }) => {
  const helpers = createTestHelpers(page);
  
  // Mock sync failure
  await helpers.mockApiError(/\/api\/sync/, 500, 'Gmail API error');
  
  await helpers.clickAndWait(SELECTORS.SYNC_BUTTON);
  await helpers.waitForText('Sync failed');
  
  // Should show retry option
  await expect(page.getByText('Try again')).toBeVisible();
});
```

## CI/CD Integration

Tests are configured to run in CI environments:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    cd apps/e2e-main
    npm ci
    npm run install:browsers
    npm test
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3001-3003 are available
2. **Database issues**: Check SQLite file permissions
3. **Mock server timeouts**: Increase timeout values in config

### Debug Commands

```bash
# Check mock servers
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Check test database
node setup/test-database.js setup
```

### Test Isolation

If tests are affecting each other:
- Verify database cleanup in teardown
- Check for shared state in mocks
- Use test-specific user IDs

## Next Steps

Follow the `E2E_SETUP_TODO.md` to continue implementing:
1. Additional test scenarios
2. More comprehensive mocks
3. Performance testing
4. CI/CD integration

For questions or issues, refer to the main project documentation or create an issue.