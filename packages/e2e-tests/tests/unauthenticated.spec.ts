import { test, expect } from "@playwright/test";

/**
 * Tests for unauthenticated user flows
 * These tests explicitly don't use authentication state
 */
test.describe("Unauthenticated User", () => {
  // Override to not use auth state - use empty storageState object to clear auth
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should redirect to login page when accessing root", async ({ page }) => {
    await page.goto("/");
    
    // Wait for navigation to complete
    await page.waitForLoadState("networkidle");
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should display login page elements", async ({ page }) => {
    await page.goto("/login");
    
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    
    // Verify login page UI
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("should not be able to access authenticated routes", async ({ page }) => {
    // Try to access an authenticated route
    await page.goto("/");
    
    // Wait for navigation to complete
    await page.waitForLoadState("networkidle");
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});

