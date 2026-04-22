import { expect, test } from "@playwright/test";

test.describe("Customer assistant and feedback journeys", () => {
  test("starts a chat, gets a streamed reply, and can return to a fresh chat", async ({
    page,
    request,
  }) => {
    const warmupId = `assistant-warmup-${Date.now()}`;
    const warmupResponse = await request.post("/api/assistant", {
      data: {
        id: warmupId,
        chatId: warmupId,
        message: {
          id: warmupId,
          role: "user",
          parts: [{ type: "text", text: "Warm the assistant route." }],
        },
      },
    });

    expect(warmupResponse.ok()).toBeTruthy();
    await warmupResponse.text();

    await page.goto("/assistant");

    await expect(
      page.getByRole("heading", { name: "Swiggy Spending Assistant" }),
    ).toBeVisible();
    await expect(page.getByText("Swiggy spending snapshot")).toBeVisible();

    await page
      .getByPlaceholder("Ask about your Swiggy spending...")
      .fill("Summarize my recent spending in one sentence.");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(
      page.getByText(
        "Local mock assistant: your recent spending is mostly Swiggy food delivery right now.",
      ),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /New Chat/i }).click();

    await expect(page).toHaveURL(/\/assistant$/);
    await expect(
      page.getByPlaceholder("Ask about your Swiggy spending..."),
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

    await expect(page.getByText("Thank You!")).toBeVisible();
    await expect(
      page.getByText("Your feedback has been submitted successfully."),
    ).toBeVisible();
  });
});
