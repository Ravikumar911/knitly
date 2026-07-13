import { describe, expect, it } from "vitest";
import { stepIdToScreen, WIZARD_SCREEN_ORDER } from "./screens";

describe("onboard wizard screens", () => {
  it("keeps the eight-screen desktop order", () => {
    expect(WIZARD_SCREEN_ORDER).toEqual([
      "welcome",
      "assistant",
      "ollama",
      "gmail",
      "app-password",
      "imap",
      "finishing",
      "ready",
    ]);
  });

  it("maps pipeline steps onto wizard screens", () => {
    expect(stepIdToScreen("welcome")).toBe("welcome");
    expect(stepIdToScreen("assistant-provider")).toBe("assistant");
    expect(stepIdToScreen("homebrew")).toBe("ollama");
    expect(stepIdToScreen("ollama-pull")).toBe("ollama");
    expect(stepIdToScreen("gmail-account")).toBe("gmail");
    expect(stepIdToScreen("gmail-app-password")).toBe("app-password");
    expect(stepIdToScreen("imap-verify")).toBe("imap");
    expect(stepIdToScreen("kickoff-sync")).toBe("finishing");
    expect(stepIdToScreen("dashboard-service")).toBe("finishing");
  });
});
