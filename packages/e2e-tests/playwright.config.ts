import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve, join } from "path";
import { existsSync } from "fs";

/**
 * Load environment variables from .env files
 * https://github.com/motdotla/dotenv
 * 
 * Looks for .env and .env.local files in the e2e-tests package directory
 * Works whether running from package root or monorepo root
 * .env.local takes precedence over .env (standard Next.js behavior)
 */
const baseDir = existsSync(".env") || existsSync(".env.local")
  ? "." // Running from e2e-tests directory
  : resolve(process.cwd(), "packages/e2e-tests"); // Running from monorepo root

// Load .env first (lower priority)
const envPath = resolve(baseDir, ".env");
if (existsSync(envPath)) {
  config({ path: envPath });
}

// Load .env.local second (higher priority, overrides .env)
const envLocalPath = resolve(baseDir, ".env.local");
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Maximum time one test can run for. Default is 30 seconds. */
  timeout: 60 * 1000, // 60 seconds for regular tests
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs once before all tests
    // Run this manually with: pnpm playwright test --project=setup
    { 
      name: 'setup', 
      testDir: '.',
      testMatch: /.*\.setup\.ts/,
      /* Extended timeout for setup project since it requires manual authentication */
      timeout: 15 * 60 * 1000, // 15 minutes for manual auth setup
      use: {
        // Run in headed mode for manual authentication
        headless: false,
        // Slow down actions for visibility during manual auth
        launchOptions: {
          slowMo: 500,
          // Use persistent context to avoid Google's "browser not secure" error
          // This makes Playwright use a real Chrome user profile
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
          ],
        },
        // Add extra HTTP headers to make browser look more legitimate
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
        // Use a persistent context directory to maintain browser state
        // This helps Google recognize it as a real browser session
        contextOptions: {
          viewport: { width: 1280, height: 720 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },

    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        // Use saved authentication state from setup
        storageState: 'playwright/.auth/user.json',
      },
      // Don't auto-run setup - run it manually when needed
      // dependencies: ['setup'],
    },

    {
      name: "firefox",
      use: { 
        ...devices["Desktop Firefox"],
        // Use saved authentication state from setup
        storageState: 'playwright/.auth/user.json',
      },
      // Don't auto-run setup - run it manually when needed
      // dependencies: ['setup'],
    },

    {
      name: "webkit",
      use: { 
        ...devices["Desktop Safari"],
        // Use saved authentication state from setup
        storageState: 'playwright/.auth/user.json',
      },
      // Don't auto-run setup - run it manually when needed
      // dependencies: ['setup'],
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm --filter @knitly/main dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

