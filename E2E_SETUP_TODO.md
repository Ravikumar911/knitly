# E2E Testing Setup TODO

## Overview
This document outlines the complete setup needed to run end-to-end tests for the Knitly application with proper mocking of external services including trigger.dev, database, and authentication.

## Architecture Components to Mock

### 1. Authentication (Supabase + Google OAuth)
- **Current**: Uses Supabase auth with Google OAuth 
- **Files**: `apps/main/supabase/`, `apps/main/middleware.ts`
- **Mock Strategy**: Mock Supabase client and auth responses

### 2. Database (PostgreSQL + Drizzle)
- **Current**: PostgreSQL with Drizzle ORM
- **Files**: `packages/database/src/schema/`, `packages/database/drizzle.config.ts`
- **Mock Strategy**: In-memory SQLite database for tests

### 3. Trigger.dev Tasks
- **Current Tasks**:
  - `processEmails` - Main email processing coordinator
  - `processEmailBatch` - Batch processing worker  
  - `detectDuplicateTransactionsForUser` - Duplicate detection
  - `nightlyEmailSync` - Scheduled sync task
- **Files**: `packages/tasks/src/trigger/`
- **Mock Strategy**: Mock task execution and responses

### 4. External APIs
- **Gmail API**: Email fetching and processing
- **OpenAI**: AI-based transaction extraction
- **Google Auth**: Token refresh and management

---

## TODO List

### Phase 1: E2E Test Infrastructure Setup

#### 1.1 Create E2E Test Package Structure
- [ ] **Create `apps/e2e-main/package.json`** with dependencies:
  ```json
  {
    "name": "e2e-main",
    "scripts": {
      "test": "playwright test",
      "test:ui": "playwright test --ui",
      "test:headed": "playwright test --headed",
      "test:debug": "playwright test --debug"
    },
    "dependencies": {
      "@playwright/test": "^1.40.0",
      "@supabase/supabase-js": "^2.38.0",
      "drizzle-orm": "^0.29.0",
      "better-sqlite3": "^8.7.0",
      "@workspace/database": "workspace:*",
      "@workspace/tasks": "workspace:*"
    }
  }
  ```

- [ ] **Create `apps/e2e-main/playwright.config.ts`** with:
  - Test environment configuration
  - Browser setup (chromium, firefox, webkit)
  - Base URL configuration
  - Parallel test execution settings
  - Screenshot and video capture on failure

- [ ] **Create `apps/e2e-main/tsconfig.json`** extending workspace config

#### 1.2 Database Mock Setup
- [ ] **Create `apps/e2e-main/setup/database.ts`**:
  - In-memory SQLite database setup
  - Schema migration for tests
  - Seed data creation functions
  - Database cleanup utilities

- [ ] **Create test database fixtures**:
  - User accounts with different states
  - Sample transactions and emails
  - OAuth token mock data
  - Sync status test scenarios

#### 1.3 Authentication Mock Setup  
- [ ] **Create `apps/e2e-main/mocks/auth.ts`**:
  - Mock Supabase client factory
  - Test user session generation
  - OAuth flow simulation
  - JWT token generation for tests

- [ ] **Create authentication test utilities**:
  - Login helper functions
  - Session management
  - Permission testing utilities

### Phase 2: Service Mocking Infrastructure

#### 2.1 Trigger.dev Mock Server
- [ ] **Create `apps/e2e-main/mocks/trigger-server.ts`**:
  - Express server to mock trigger.dev endpoints
  - Task execution simulation
  - Webhook handling for task status updates
  - Configurable task responses (success/failure)

- [ ] **Mock trigger.dev task responses**:
  - `processEmails` task mock with email processing simulation
  - `processEmailBatch` worker mock with batch results
  - `detectDuplicateTransactionsForUser` mock
  - `nightlyEmailSync` scheduled task mock

- [ ] **Create task execution utilities**:
  - Task trigger simulation
  - Progress tracking mock
  - Error scenario testing
  - Batch processing simulation

#### 2.2 External API Mocks
- [ ] **Create `apps/e2e-main/mocks/gmail-api.ts`**:
  - Gmail message fetching mock
  - Email search query simulation
  - Attachment handling mock
  - Rate limiting simulation

- [ ] **Create `apps/e2e-main/mocks/openai-api.ts`**:
  - AI transaction extraction mock
  - Different response scenarios (success/failure)
  - Various email types processing

- [ ] **Create `apps/e2e-main/mocks/google-auth.ts`**:
  - Token refresh simulation
  - OAuth error scenarios
  - Permission handling

#### 2.3 Network Interception Setup
- [ ] **Configure Playwright request interception**:
  - Route trigger.dev API calls to mock server
  - Intercept Gmail API requests
  - Mock OpenAI API responses
  - Handle authentication flows

### Phase 3: Test Utilities and Helpers

#### 3.1 Test Helper Functions
- [ ] **Create `apps/e2e-main/utils/test-helpers.ts`**:
  - Page navigation utilities
  - Element interaction helpers
  - Wait conditions for async operations
  - Screenshot and debugging utilities

- [ ] **Create `apps/e2e-main/utils/data-helpers.ts`**:
  - Test data generation
  - Database seeding utilities
  - Mock data factories
  - Cleanup functions

#### 3.2 Page Object Models
- [ ] **Create page objects for main application pages**:
  - `LoginPage` - Authentication flows
  - `DashboardPage` - Main dashboard interactions
  - `TransactionsPage` - Transaction management
  - `SettingsPage` - App settings and sync controls
  - `AnalyticsPage` - Analytics and insights

### Phase 4: Core Test Scenarios

#### 4.1 Authentication Tests
- [ ] **Create `apps/e2e-main/tests/auth.spec.ts`**:
  - User login flow with Google OAuth
  - Session persistence testing
  - Logout functionality
  - Protected route access control
  - Token refresh scenarios

#### 4.2 Email Sync Tests  
- [ ] **Create `apps/e2e-main/tests/email-sync.spec.ts`**:
  - Initial sync flow for new users
  - Manual sync trigger
  - Sync progress monitoring
  - Error handling during sync
  - OAuth error recovery

#### 4.3 Transaction Management Tests
- [ ] **Create `apps/e2e-main/tests/transactions.spec.ts`**:
  - Transaction list display
  - Filtering and sorting
  - PDF generation and viewing
  - Transaction details modal
  - Duplicate detection verification

#### 4.4 Analytics Tests
- [ ] **Create `apps/e2e-main/tests/analytics.spec.ts`**:
  - Dashboard analytics display
  - Date range filtering
  - Swiggy-specific metrics
  - Insights generation
  - Chart interactions

### Phase 5: Advanced Test Scenarios

#### 5.1 Error Handling Tests
- [ ] **Create comprehensive error scenario tests**:
  - Network failure during sync
  - Database connection issues
  - External API rate limiting
  - OAuth token expiration
  - Trigger.dev task failures

#### 5.2 Performance Tests
- [ ] **Large dataset handling**:
  - Sync with large email volumes
  - Transaction list pagination
  - Search performance
  - Memory usage monitoring

#### 5.3 Integration Tests
- [ ] **End-to-end workflow tests**:
  - Complete user onboarding flow
  - Full sync and analysis cycle
  - Multi-service interaction scenarios

### Phase 6: Test Infrastructure Optimization

#### 6.1 Parallel Test Execution
- [ ] **Configure test isolation**:
  - Database state management between tests
  - Mock server instance isolation
  - User session isolation

#### 6.2 CI/CD Integration
- [ ] **GitHub Actions workflow**:
  - Automated test execution
  - Database setup in CI
  - Mock service orchestration
  - Test result reporting

#### 6.3 Test Data Management
- [ ] **Fixture management system**:
  - Reusable test data sets
  - Dynamic fixture generation
  - Data cleanup automation

---

## Implementation Priority

### High Priority (Phase 1-2)
1. Basic e2e infrastructure setup
2. Database and auth mocking
3. Trigger.dev mock server
4. Core authentication tests

### Medium Priority (Phase 3-4)  
1. Test utilities and page objects
2. Core user journey tests
3. Error handling scenarios

### Low Priority (Phase 5-6)
1. Advanced integration tests
2. Performance testing
3. CI/CD optimization

---

## Technical Considerations

### Mock Server Architecture
```typescript
// Example mock server structure
interface MockTriggerServer {
  startServer(): Promise<void>;
  stopServer(): Promise<void>;
  mockTask(taskId: string, response: any): void;
  triggerWebhook(taskId: string, status: 'success' | 'failure'): void;
}
```

### Database Test Pattern
```typescript
// Example test database setup
beforeEach(async () => {
  await setupTestDatabase();
  await seedTestData();
});

afterEach(async () => {
  await cleanupTestDatabase();
});
```

### Authentication Mock Pattern
```typescript
// Example auth mock
await page.route('**/auth/**', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, user: mockUser })
  });
});
```

---

## Environment Variables Required

Create `apps/e2e-main/.env.test`:
```env
# Database
DATABASE_URL="file:./test.db"

# Supabase (test values)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="test-key"

# Trigger.dev (mock server)
TRIGGER_SECRET_KEY="test-secret"
TRIGGER_API_URL="http://localhost:3001"

# Mock API endpoints
MOCK_GMAIL_API_URL="http://localhost:3002"
MOCK_OPENAI_API_URL="http://localhost:3003"
```

This comprehensive setup will provide a robust e2e testing environment with proper mocking of all external dependencies while maintaining test reliability and speed.