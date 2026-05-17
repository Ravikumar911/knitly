import { describe, expect, it } from "vitest";
import { createWorkPool } from "./pool";

describe("createWorkPool", () => {
  it("runs all work without exceeding concurrency", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const pool = createWorkPool<number, number>({
      concurrency: 5,
      async work(item) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        return item * 2;
      },
    });

    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) => pool.submit(index)),
    );
    const settlements = await pool.drain();

    expect(results).toHaveLength(100);
    expect(settlements).toHaveLength(100);
    expect(maxInFlight).toBeLessThanOrEqual(5);
  });

  it("does not drop queued work after a rejection", async () => {
    const pool = createWorkPool<number, number>({
      concurrency: 2,
      async work(item) {
        if (item === 3) throw new Error("boom");
        return item;
      },
    });

    const jobs = [1, 2, 3, 4, 5].map((item) =>
      pool.submit(item).catch((error) => error),
    );
    await Promise.all(jobs);
    const settlements = await pool.drain();

    expect(settlements).toHaveLength(5);
    expect(
      settlements.filter((settlement) => settlement.status === "fulfilled"),
    ).toHaveLength(4);
  });

  it("rejects drain with the first error when failFast is true", async () => {
    const pool = createWorkPool<number, number>({
      concurrency: 2,
      failFast: true,
      async work(item) {
        if (item === 2) throw new Error("first failure");
        return item;
      },
    });

    await Promise.all([
      pool.submit(1),
      pool.submit(2).catch((error) => error),
      pool.submit(3),
    ]);

    await expect(pool.drain()).rejects.toThrow("first failure");
  });
});
