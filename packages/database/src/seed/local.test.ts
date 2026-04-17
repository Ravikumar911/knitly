import { describe, expect, it } from "vitest";
import { seedLocalDatabase } from "./local";
import { ensureLocalDatabase, sqlite } from "../index";

describe("local database seed", () => {
  it("creates the local schema and deterministic seed rows", async () => {
    ensureLocalDatabase();
    await seedLocalDatabase();

    const transactionCount = sqlite
      .prepare("select count(*) as count from transactions_v2")
      .get() as { count: number };
    const chatCount = sqlite
      .prepare("select count(*) as count from chats")
      .get() as { count: number };

    expect(transactionCount.count).toBe(8);
    expect(chatCount.count).toBe(1);
  });
});
