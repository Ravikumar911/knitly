import { describe, expect, it } from "vitest";
import { runSingleFlight } from "./mutex.js";

describe("runSingleFlight", () => {
  it("skips concurrent work for the same key", async () => {
    let release!: () => void;
    const first = runSingleFlight(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve("done");
        }),
      "unit-test",
    );

    const second = await runSingleFlight(async () => "unexpected", "unit-test");
    release();

    expect(second).toEqual({ status: "skipped", reason: "busy" });
    await expect(first).resolves.toEqual({ status: "ran", value: "done" });
  });
});
