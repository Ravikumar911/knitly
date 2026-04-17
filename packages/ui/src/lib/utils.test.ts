import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges conditional class names and tailwind conflicts", () => {
    const isHidden = false;

    expect(cn("px-2", isHidden && "hidden", "px-4", ["text-sm"])).toBe(
      "px-4 text-sm",
    );
  });
});
