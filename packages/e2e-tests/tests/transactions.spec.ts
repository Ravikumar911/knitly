import { expect, test } from "@playwright/test";

test.describe("Customer transaction journeys", () => {
  test("reviews transactions and can reverse the sort order", async ({
    page,
  }) => {
    await page.goto("/dashboard/transactions");

    const rows = page.locator("tbody tr");

    await expect(rows.first()).toBeVisible();
    await expect(page.getByText("Truffles").first()).toBeVisible();

    const firstRowBefore = (await rows.first().textContent()) || "";

    await page.getByRole("button", { name: /Date/ }).click();

    await expect
      .poll(async () => (await rows.first().textContent()) || "")
      .not.toBe(firstRowBefore);
  });

  test("opens a receipt from the transactions list", async ({ page }) => {
    await page.goto("/dashboard/transactions");

    await page
      .getByRole("button", { name: /Open invoice/i })
      .first()
      .click();

    await expect(
      page.getByRole("heading", { name: "Transaction Invoice" }),
    ).toBeVisible();

    const invoiceFrame = page.locator('iframe[title="Transaction invoice"]');
    await expect(invoiceFrame).toBeVisible();
    await expect(invoiceFrame).toHaveAttribute("src", /\/api\/attachments\//);
  });
});
