import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");
    
    // Verify login page elements
    await expect(page.getByRole("heading", { name: "Welcome to Slash" })).toBeVisible();
  });

  test("should display login options", async ({ page }) => {
    await page.goto("/login");
    
    // Verify login UI elements
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Gmail Address" })).toBeVisible();
  });
});

