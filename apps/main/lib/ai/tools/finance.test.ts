import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database", () => ({
  LOCAL_USER_ID: "local",
  listAssistantOrders: vi.fn(),
  getAssistantSpendingSummary: vi.fn(),
  getAssistantSpendingTrends: vi.fn(),
  getAssistantTopMerchants: vi.fn(),
  getAssistantOrderDetail: vi.fn(),
  getUserSpendingOverview: vi.fn(),
}));

import { listAssistantOrders } from "@workspace/database";
import { listOrdersTool } from "./finance";

const listAssistantOrdersMock = vi.mocked(listAssistantOrders);

describe("finance tools (AI SDK)", () => {
  beforeEach(() => {
    listAssistantOrdersMock.mockReset();
  });

  it("listOrders tool calls the narrow DB helper and returns compact result for the model", async () => {
    listAssistantOrdersMock.mockResolvedValueOnce({
      orders: [
        {
          date: "2026-05-23",
          transactionId: "tx-123",
          merchantName: "Test Restaurant",
          amount: 450,
          serviceType: "foodDelivery",
          items: [],
        },
      ],
      dataRange: { startDate: "2026-05-01", endDate: "2026-05-23" },
      count: 1,
    });

    const result = await listOrdersTool.execute?.({
      recentOnly: true,
      limit: 5,
    });

    expect(listAssistantOrdersMock).toHaveBeenCalledWith(
      "local",
      expect.objectContaining({
        recentOnly: true,
        limit: 5,
      }),
    );
    expect(result?.orders).toHaveLength(1);
    expect(result?.returnedCount).toBe(1);
  });
});
