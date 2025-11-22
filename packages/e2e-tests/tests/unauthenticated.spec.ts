import { test, expect } from "@playwright/test";

test.describe("Unauthenticated User", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should redirect to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show login button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("should protect dashboard route", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

