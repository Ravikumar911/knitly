import { describe, expect, it, vi } from "vitest";
import {
  isAssistantLandingPath,
  isUuid,
  syncAssistantUrlToChatId,
} from "./assistant-url";

const validId = "662d0bbb-179a-4ff0-981c-bca4f8389506";

describe("assistant-url", () => {
  it("isAssistantLandingPath", () => {
    expect(isAssistantLandingPath("/assistant")).toBe(true);
    expect(isAssistantLandingPath("/assistant/")).toBe(true);
    expect(isAssistantLandingPath("/assistant/x")).toBe(false);
  });

  it("isUuid", () => {
    expect(isUuid(validId)).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("syncAssistantUrlToChatId is a no-op when window is missing", () => {
    expect(syncAssistantUrlToChatId(validId)).toBe(false);
  });

  it("syncAssistantUrlToChatId calls replaceState when on /assistant", () => {
    const replaceState = vi.fn();
    const win = {
      location: { pathname: "/assistant" },
      history: { replaceState },
      dispatchEvent: vi.fn(),
    };
    const original = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: win,
    });
    try {
      const ok = syncAssistantUrlToChatId(validId);
      expect(ok).toBe(true);
      expect(replaceState).toHaveBeenCalledWith(
        null,
        "",
        `/assistant/${validId}`,
      );
      expect(win.dispatchEvent).toHaveBeenCalled();
    } finally {
      if (original === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).window;
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: original,
        });
      }
    }
  });
});
