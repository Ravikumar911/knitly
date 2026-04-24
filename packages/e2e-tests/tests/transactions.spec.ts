import { expect, test } from "@playwright/test";

test.describe("Customer transaction journeys", () => {
  test("reviews transactions and can reverse the sort order", async ({
    page,
  }) => {
    await page.goto("/dashboard/transactions");

    const rows = page.locator("tbody tr");

    await expect(rows.first()).toBeVisible();
    await expect(page.getByText("Truffles").first()).toBeVisible();
    await expect(rows.first()).toContainText("Dinner order from Truffles");

    const dateSortButton = page.getByRole("button", {
      name: /Sort by date ascending/i,
    });

    await dateSortButton.click();

    await expect(
      page.getByRole("button", { name: /Sort by date descending/i }),
    ).toBeVisible();
    await expect(rows.first()).toContainText("Swiggy order - Millet Bowl Co", {
      timeout: 15_000,
    });
  });

  test("opens a receipt from the transactions list", async ({ page }) => {
    await page.goto("/dashboard/transactions");

    const invoiceButton = page.getByRole("button", {
      name: /Open invoice for Swiggy order - Millet Bowl Co/i,
    });
    await invoiceButton.scrollIntoViewIfNeeded();
    await expect(invoiceButton).toBeVisible();
    await invoiceButton.click();

    await expect(
      page.getByRole("heading", { name: "Transaction Invoice" }),
    ).toBeVisible({ timeout: 10_000 });

    const invoiceFrame = page.locator('iframe[title="Transaction invoice"]');
    await expect(invoiceFrame).toBeVisible();
    await expect(invoiceFrame).toHaveAttribute("src", /\/api\/attachments\//);
  });
});
