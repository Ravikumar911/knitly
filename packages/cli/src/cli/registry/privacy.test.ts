import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
import { TOP_BANNER } from "../../privacy/copy.js";
import { register } from "./privacy.js";

describe("privacy command", () => {
  it("prints the privacy banner and doc references", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = new Command();
    register(program);

    await program.parseAsync(["privacy"], { from: "user" });

    expect(logSpy).toHaveBeenNthCalledWith(1, TOP_BANNER);
    expect(logSpy).toHaveBeenNthCalledWith(2, "");
    expect(logSpy).toHaveBeenNthCalledWith(
      3,
      "Why this appears during onboarding: packages/docs/reference/decisions.md#adr-024---gmail-sync-via-imap-and-app-passwords",
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      4,
      "Data flow: packages/docs/architecture.md",
    );
  });
});
