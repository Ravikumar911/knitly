import { describe, expect, it } from "vitest";
import { isAssistantConfigureError } from "./assistant-errors";

describe("isAssistantConfigureError", () => {
  it("detects 409 and configure message from API", () => {
    expect(
      isAssistantConfigureError(
        new Error("Configure an assistant provider before starting chat."),
      ),
    ).toBe(true);
  });

  it("detects status on error object", () => {
    expect(isAssistantConfigureError({ status: 409 })).toBe(true);
  });

  it("returns false for random errors", () => {
    expect(isAssistantConfigureError(new Error("network down"))).toBe(false);
  });
});
