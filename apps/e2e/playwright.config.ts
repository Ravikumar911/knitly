import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'main-app-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
      testMatch: '**/main/**/*.spec.ts',
    },

    {
      name: 'website-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
      testMatch: '**/website/**/*.spec.ts',
    },

    {
      name: 'main-app-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:3000',
      },
      testMatch: '**/main/**/*.spec.ts',
    },

    {
      name: 'website-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:3001',
      },
      testMatch: '**/website/**/*.spec.ts',
    },

    /* Test against mobile viewports. */
    {
      name: 'main-app-mobile',
      use: { 
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:3000',
      },
      testMatch: '**/main/**/*.spec.ts',
    },
  ],

  /* For development: Start your dev servers manually before running tests
   * For CI: Uncomment webServer configuration below
   
  webServer: [
    {
      command: 'pnpm --filter main dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter website dev',
      url: 'http://localhost:3001', 
      reuseExistingServer: true,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
  */
});