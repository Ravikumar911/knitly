import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearPidFile: vi.fn(),
  isProcessAlive: vi.fn(),
  readPidFile: vi.fn(),
}));

vi.mock("../../runtime/pid.js", () => ({
  clearPidFile: mocks.clearPidFile,
  isProcessAlive: mocks.isProcessAlive,
  readPidFile: mocks.readPidFile,
}));

vi.mock("picocolors", () => ({
  default: {
    green: (value: string) => `green(${value})`,
  },
}));

describe("stop command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("prints a friendly message when nothing is running", async () => {
    mocks.readPidFile.mockReturnValue(null);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { register } = await import("./stop.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["stop"], { from: "user" });

    expect(logSpy).toHaveBeenCalledWith("slash.cash is not running.");
    expect(mocks.clearPidFile).not.toHaveBeenCalled();
  });

  it("terminates a running dashboard and clears the pid file", async () => {
    mocks.readPidFile.mockReturnValue({ pid: 4321 });
    mocks.isProcessAlive
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { register } = await import("./stop.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["stop"], { from: "user" });

    expect(killSpy).toHaveBeenCalledWith(4321, "SIGTERM");
    expect(mocks.clearPidFile).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith("green(Stopped slash.cash.)");
  });
});
