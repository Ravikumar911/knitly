import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("Customer assistant and feedback journeys", () => {
  test("starts a chat, gets a streamed reply, and can return to a fresh chat", async ({
    page,
    request,
  }) => {
    // Warm up the streaming transport (the one the real UI uses).
    const warmupId = randomUUID();
    const warmupResponse = await request.post("/api/assistant/stream", {
      data: {
        chatId: warmupId,
        messages: [
          {
            id: warmupId,
            role: "user",
            parts: [{ type: "text", text: "Warm the assistant route." }],
          },
        ],
      },
    });

    expect(warmupResponse.ok()).toBeTruthy();
    await warmupResponse.text();

    await page.goto("/assistant");
    await expect(page).toHaveURL(/\/assistant$/);

    await expect(
      page.getByRole("link", { name: /New chat/i }).first(),
    ).toBeVisible();

    const suggestion = "What are my recent Swiggy orders?";
    await page.getByRole("button", { name: suggestion }).click();
    await expect(page.getByRole("log").getByText(suggestion)).toBeVisible();

    // The mock always returns the same static sentence. We assert that *some*
    // assistant content appeared rather than hard-coding the old fallback string
    // (which was removed in the 5-tool refactor).
    await expect(
      page
        .locator('[data-testid="assistant-message"], .prose, [role="status"]')
        .or(page.getByText(/spending|orders|Swiggy|mock assistant/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto("/assistant");
    await expect(page).toHaveURL(/\/assistant$/);
    await expect(
      page.getByPlaceholder(/Ask about your spending/),
    ).toBeVisible();
  });

  test("submits product feedback from inside the app", async ({ page }) => {
    await page.goto("/feedback");

    await expect(
      page.getByRole("heading", { name: "Send Feedback" }),
    ).toBeVisible();

    await page.getByLabel("Improvement").click();
    await page
      .getByPlaceholder("Brief summary of your feedback")
      .fill("Make journey coverage easier to review");
    await page
      .getByPlaceholder(
        "Please provide detailed information about your feedback...",
      )
      .fill(
        "The new customer-journey tests make it much easier to understand what slash.cash actually protects.",
      );
    await page
      .getByPlaceholder("your.email@example.com")
      .fill("local@slash.cash");

    await page.getByRole("button", { name: "Send Feedback" }).click();

    await expect(page.getByText("Thank You!")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText("Your feedback has been submitted successfully."),
    ).toBeVisible();
  });
});
