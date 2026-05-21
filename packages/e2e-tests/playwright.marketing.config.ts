import { defineConfig, devices } from "@playwright/test";

/** Minimal config for marketing-site smoke (no globalSetup / no main app). */
export default defineConfig({
  testDir: "./tests",
  testMatch: "marketing-website.smoke.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
