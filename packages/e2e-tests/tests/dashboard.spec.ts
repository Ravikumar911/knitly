import { expect, test } from "@playwright/test";

test.describe("Customer dashboard journeys", () => {
  test("opens the local dashboard without sign-in and shows real spending context", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("link", { name: "Dashboard" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Assistant" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Core Spending Overview" }),
    ).toBeVisible();
    await expect(page.getByText("Top Restaurants")).toBeVisible();
    await expect(page.getByText("Truffles").first()).toBeVisible();
  });

  test("moves across the main product surfaces from the app shell", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);
    await expect(page.getByText("Meghana Foods").first()).toBeVisible();

    await page.getByRole("link", { name: "Assistant" }).click();
    await expect(page).toHaveURL(/\/assistant$/);
    await expect(
      page.getByRole("link", { name: /New chat/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/Ask about your spending/),
    ).toBeVisible();

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText("Sync Complete!")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sync Again|Start Local Setup/i }),
    ).toBeVisible();
  });
});
