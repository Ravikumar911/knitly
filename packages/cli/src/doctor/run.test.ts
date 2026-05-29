import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runChecks: vi.fn(),
}));

vi.mock("./checks.js", () => ({
  runChecks: mocks.runChecks,
}));

vi.mock("picocolors", () => ({
  default: {
    green: (value: string) => `green(${value})`,
    red: (value: string) => `red(${value})`,
  },
}));

describe("doctor runner", () => {
  const previousExitCode = process.exitCode;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it("prints human-readable status lines and sets a failing exit code", async () => {
    mocks.runChecks.mockResolvedValue([
      {
        id: "node",
        name: "Node",
        label: "Node",
        category: "binary",
        status: "ok",
        message: "v22.0.0",
        durationMs: 1,
      },
      {
        id: "sqlite",
        name: "SQLite",
        label: "SQLite",
        category: "filesystem",
        status: "fail",
        message: "missing db",
        durationMs: 2,
      },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { runDoctor } = await import("./run.js");
    const checks = await runDoctor();

    expect(checks).toHaveLength(2);
    expect(logSpy).toHaveBeenNthCalledWith(1, "green(ok) Node: v22.0.0");
    expect(logSpy).toHaveBeenNthCalledWith(2, "red(fail) SQLite: missing db");
    expect(process.exitCode).toBe(1);
  });

  it("prints JSON when requested", async () => {
    const checks = [
      {
        id: "node",
        name: "Node",
        label: "Node",
        category: "binary" as const,
        status: "ok" as const,
        message: "v22.0.0",
        durationMs: 1,
      },
    ];
    mocks.runChecks.mockResolvedValue(checks);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { runDoctor } = await import("./run.js");
    await runDoctor({ json: true });

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(checks, null, 2));
    expect(process.exitCode).toBeUndefined();
  });
});
