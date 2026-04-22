import { beforeEach, describe, expect, it } from "vitest";
import { useTransactionFilters } from "./transaction-filters";

describe("useTransactionFilters", () => {
  beforeEach(() => {
    useTransactionFilters.getState().resetFilters();
  });

  it("updates and resets transaction filter state", () => {
    const startDate = new Date("2026-04-01T00:00:00.000Z");

    useTransactionFilters.getState().setType("debit");
    useTransactionFilters.getState().setCategory("food");
    useTransactionFilters.getState().setStartDate(startDate);
    useTransactionFilters.getState().setAmountMin(100);

    expect(useTransactionFilters.getState()).toMatchObject({
      type: "debit",
      category: "food",
      startDate,
      amountMin: 100,
      endDate: null,
      amountMax: null,
    });

    useTransactionFilters.getState().resetFilters();

    expect(useTransactionFilters.getState()).toMatchObject({
      type: null,
      category: null,
      startDate: null,
      endDate: null,
      amountMin: null,
      amountMax: null,
    });
  });
});
