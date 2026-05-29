import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePaths: vi.fn(),
  loadConfig: vi.fn(),
  readDashboardServiceStatus: vi.fn(),
  readPidFile: vi.fn(),
  isProcessAlive: vi.fn(),
  listInstalledSkills: vi.fn(),
}));

vi.mock("../../config/paths.js", () => ({
  resolvePaths: mocks.resolvePaths,
}));

vi.mock("../../config/load.js", () => ({
  loadConfig: mocks.loadConfig,
}));

vi.mock("../../daemon/service.js", () => ({
  readDashboardServiceStatus: mocks.readDashboardServiceStatus,
}));

vi.mock("../../runtime/pid.js", () => ({
  readPidFile: mocks.readPidFile,
  isProcessAlive: mocks.isProcessAlive,
}));

vi.mock("../../skills/registry.js", () => ({
  listInstalledSkills: mocks.listInstalledSkills,
}));

describe("status command", () => {
  const previousFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.resolvePaths.mockReturnValue({
      db: "/tmp/slashcash-home/db.sqlite",
      attachments: "/tmp/slashcash-home/attachments",
    });
    mocks.loadConfig.mockReturnValue({
      server: { port: 3000 },
    });
    mocks.readDashboardServiceStatus.mockReturnValue({
      kind: "none",
      loaded: false,
      stdoutPath: "/tmp/slashcash-home/logs/dashboard.log",
      stderrPath: "/tmp/slashcash-home/logs/dashboard.err.log",
    });
    mocks.listInstalledSkills.mockReturnValue([
      { id: "gmail-swiggy", enabled: true },
      { id: "alpha-skill", enabled: false },
      { id: "beta-skill", enabled: true },
    ]);
  });

  afterEach(() => {
    globalThis.fetch = previousFetch;
  });

  it("prints running status with a healthy server", async () => {
    mocks.readPidFile.mockReturnValue({
      pid: 4321,
      port: 3000,
      dbPath: "/tmp/custom.sqlite",
      attachmentsPath: "/tmp/attachments",
    });
    mocks.isProcessAlive.mockReturnValue(true);
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { register } = await import("./status.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["status"], { from: "user" });

    expect(logSpy.mock.calls.map((call) => call[0])).toEqual([
      "service         none",
      "pid             4321",
      "process         running",
      "port            3000",
      "healthz         ok",
      "service logs    /tmp/slashcash-home/logs/dashboard.log",
      "service errors  /tmp/slashcash-home/logs/dashboard.err.log",
      "db              /tmp/custom.sqlite",
      "attachments     /tmp/attachments",
      "enabled skills  2",
    ]);
  });

  it("falls back to default paths when the app is not running", async () => {
    mocks.readPidFile.mockReturnValue(null);
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("connection refused"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { register } = await import("./status.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["status"], { from: "user" });

    expect(logSpy.mock.calls.map((call) => call[0])).toEqual([
      "service         none",
      "pid             -",
      "process         stopped",
      "port            3000",
      "healthz         unreachable",
      "service logs    /tmp/slashcash-home/logs/dashboard.log",
      "service errors  /tmp/slashcash-home/logs/dashboard.err.log",
      "db              /tmp/slashcash-home/db.sqlite",
      "attachments     /tmp/slashcash-home/attachments",
      "enabled skills  2",
    ]);
  });
});
