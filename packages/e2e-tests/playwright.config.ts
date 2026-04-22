import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import {
  appPort,
  baseURL,
  createPlaywrightEnv,
  mockOllamaPort,
  shellEnvPrefix,
} from "./playwright-env";

/**
 * Load environment variables from .env files
 * https://github.com/motdotla/dotenv
 *
 * Looks for .env and .env.local files in the e2e-tests package directory
 * Works whether running from package root or monorepo root
 * .env.local takes precedence over .env (standard Next.js behavior)
 */
const baseDir =
  existsSync(".env") || existsSync(".env.local")
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
  globalSetup: "./global-setup.ts",
  /* Maximum time one test can run for. Default is 30 seconds. */
  timeout: 60 * 1000, // 60 seconds for regular tests
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
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

  /* Run the same local stack a customer would use before starting the tests. */
  webServer: [
    {
      command: `${shellEnvPrefix({
        MOCK_OLLAMA_PORT: String(mockOllamaPort),
      })} pnpm exec tsx scripts/mock-ollama.ts`,
      url: `http://127.0.0.1:${mockOllamaPort}/healthz`,
      reuseExistingServer: false,
      timeout: 30 * 1000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `${shellEnvPrefix(
        createPlaywrightEnv() as Record<string, string | undefined>,
      )} pnpm --filter slashcash dev -- start --port ${appPort} --no-open`,
      url: `${baseURL}/api/healthz`,
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
