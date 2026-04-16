import { test, expect } from "@playwright/test";

test.describe("Local Access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should open the local app without sign in", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  });

  test("should allow direct dashboard access", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  });
});
