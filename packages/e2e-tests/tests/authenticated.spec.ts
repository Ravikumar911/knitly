import { test, expect } from "@playwright/test";

test.describe("Authenticated User", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("should access dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/(dashboard|)$/);
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("should navigate between routes", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);

    await page.getByRole("link", { name: "Dashboard" }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should have valid auth cookie", async ({ page }) => {
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some((c) =>
      c.name.startsWith("sb-") && c.name.includes("-auth-token")
    );
    expect(hasAuthCookie).toBeTruthy();
  });

  test("should display user email", async ({ page }) => {
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) {
      test.skip();
      return;
    }
    
    const emailPrefix = userEmail.split("@")[0]!;
    await expect(page.getByText(emailPrefix, { exact: false })).toBeVisible();
  });
});
