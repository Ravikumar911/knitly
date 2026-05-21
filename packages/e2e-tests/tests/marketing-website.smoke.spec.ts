import { test, expect } from "@playwright/test";

/**
 * Run with the marketing dev server up, for example:
 *   pnpm --filter @knitly/website dev
 *   MARKETING_SITE_URL=http://127.0.0.1:3001 pnpm exec playwright test tests/marketing-website.smoke.spec.ts --project=chromium
 */
const base = process.env.MARKETING_SITE_URL;

test.describe("marketing website (opt-in)", () => {
  test.skip(!base, "Set MARKETING_SITE_URL, e.g. http://127.0.0.1:3001");

  test("header Install CLI opens npm in a new tab", async ({ page }) => {
    await page.goto(base!);
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("header a[href*='npmjs.com/package/slashcash']").click(),
    ]);
    await popup.waitForLoadState();
    expect(popup.url()).toContain("npmjs.com/package/slashcash");
    await popup.close();
  });

  test("FAQ accordion reveals answer text", async ({ page }) => {
    await page.goto(base!);
    await page
      .getByRole("button", { name: /Does Slash Cash upload my bank data/i })
      .click();
    await expect(
      page.getByText(/SQLite on your machine/i).first(),
    ).toBeVisible();
  });

  test("footer Privacy navigates in-app", async ({ page }) => {
    await page.goto(base!);
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
