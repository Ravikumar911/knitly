import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startDashboard: vi.fn(),
}));

vi.mock("../../start/boot.js", () => ({
  startDashboard: mocks.startDashboard,
}));

describe("start command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("passes parsed options through to the dashboard bootstrapper", async () => {
    const { register } = await import("./start.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["start", "--port", "4010", "--no-open"], { from: "user" });

    expect(mocks.startDashboard).toHaveBeenCalledWith({
      port: 4010,
      noOpen: true,
      foreground: false,
    });
  });
});
