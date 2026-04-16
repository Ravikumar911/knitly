import { test, expect } from "@playwright/test";

test.describe("Local Phase 1 Dashboard", () => {
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

  test("should expose local health status", async ({ request }) => {
    const response = await request.get("/api/healthz");
    expect(response.ok()).toBeTruthy();

    const health = await response.json();
    expect(health.mode).toBe("local");
    expect(health.ok).toBeTruthy();
  });

  test("should display user email", async ({ page }) => {
    await expect(page.getByText("local@slash.cash")).toBeVisible();
  });
});
