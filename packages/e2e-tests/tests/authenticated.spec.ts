import { test, expect } from "@playwright/test";

/**
 * Tests for authenticated user flows
 * These tests use the authentication state saved by auth.setup.ts
 * 
 * Following Playwright best practices:
 * - Wait for specific UI elements, not just page visibility
 * - Use semantic selectors (getByRole, getByText)
 * - Verify authenticated state through actual UI elements
 */
test.describe("Authenticated User", () => {
  test("should be logged in and see dashboard", async ({ page }) => {
    await page.goto("/");
    
    // Wait for navigation to complete and verify we're authenticated
    // Following Playwright best practices: wait for URL and authenticated UI elements
    await page.waitForLoadState("networkidle");
    
    // Verify we're not redirected to login - this is the main check
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    
    // Verify we're on an authenticated route (dashboard or home)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(dashboard|$)/);
    
    // Verify authenticated UI elements are visible
    // The sidebar should contain the Dashboard link
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    
    // Settings link should also be visible in sidebar
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test("should be able to navigate authenticated routes", async ({ page }) => {
    await page.goto("/");
    
    // Wait for navigation to complete
    await page.waitForLoadState("networkidle");
    // Verify we're not redirected to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    
    // Verify we can access the dashboard without redirecting to login
    await expect(page).not.toHaveURL(/\/login/);
    
    // Test navigation to Settings route
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState("networkidle");
    
    // Verify we're on settings page and still authenticated
    await expect(page).toHaveURL(/\/settings/);
    await expect(page).not.toHaveURL(/\/login/);
    
    // Navigate back to dashboard
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should have valid session", async ({ page }) => {
    await page.goto("/");
    
    // Wait for page to load and verify authenticated state
    await page.waitForLoadState("networkidle");
    // Verify we're not redirected to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    
    // Check if Supabase session exists in cookies (using @supabase/ssr)
    // The auth tokens are stored in cookies with format: sb-{project-ref}-auth-token
    const cookies = await page.context().cookies();
    const hasSupabaseAuthCookie = cookies.some(cookie => 
      cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
    );
    
    expect(hasSupabaseAuthCookie).toBeTruthy();
    
    // Also verify authenticated UI is present (double-check)
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
  });

  test("should display user information in sidebar", async ({ page }) => {
    await page.goto("/");
    
    // Wait for authenticated state
    await page.waitForLoadState("networkidle");
    // Verify we're not redirected to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    
    // Verify Settings link is visible (confirms sidebar is rendered)
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    
    // User email should be visible in the sidebar
    const userEmail = process.env.TEST_USER_EMAIL;
    if (userEmail) {
      // The email might be truncated in the UI, so check for the first part
      const emailPrefix = userEmail.split('@')[0];
      await expect(page.getByText(emailPrefix, { exact: false })).toBeVisible({ timeout: 10000 });
    }
  });
});

