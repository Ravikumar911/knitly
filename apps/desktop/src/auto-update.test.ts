import { describe, expect, it } from "vitest";
import { shouldCheckForUpdates } from "./auto-update.js";

describe("shouldCheckForUpdates", () => {
  it("is false in unpackaged / dev runs", () => {
    expect(shouldCheckForUpdates(false)).toBe(false);
  });

  it("is true when the app is packaged", () => {
    expect(shouldCheckForUpdates(true)).toBe(true);
  });
});
