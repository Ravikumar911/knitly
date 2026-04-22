import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registerCommands: vi.fn(),
  normalizeCliError: vi.fn(),
  formatCliError: vi.fn(),
}));

vi.mock("./command-catalog.js", () => ({
  registerCommands: mocks.registerCommands,
}));

vi.mock("../errors/format.js", () => ({
  normalizeCliError: mocks.normalizeCliError,
  formatCliError: mocks.formatCliError,
}));

describe("runCli", () => {
  it("formats command failures and sets a non-zero exit code", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    process.exitCode = undefined;
    const error = new Error("boom");
    mocks.registerCommands.mockImplementation(async (program) => {
      program.command("explode").action(() => {
        throw error;
      });
    });
    mocks.normalizeCliError.mockReturnValue({
      area: "runtime",
      symptom: "Command failed.",
      cause: "boom",
      fix: "Retry.",
    });
    mocks.formatCliError.mockReturnValue("formatted error");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { runCli } = await import("./run.js");
    await runCli(["explode"], { version: "1.2.3" });

    expect(mocks.registerCommands).toHaveBeenCalledWith(expect.anything(), ["explode"]);
    expect(mocks.normalizeCliError).toHaveBeenCalledWith(error);
    expect(mocks.formatCliError).toHaveBeenCalledWith({
      area: "runtime",
      symptom: "Command failed.",
      cause: "boom",
      fix: "Retry.",
    });
    expect(errorSpy).toHaveBeenCalledWith("formatted error");
    expect(process.exitCode).toBe(1);
  });
});
