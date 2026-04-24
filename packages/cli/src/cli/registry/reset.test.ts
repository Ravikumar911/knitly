import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rmSync: vi.fn(),
  clearPidFile: vi.fn(),
  isProcessAlive: vi.fn(),
  readPidFile: vi.fn(),
  resetStoredCredentials: vi.fn(),
  resolvePaths: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  rmSync: mocks.rmSync,
}));

vi.mock("../../runtime/pid.js", () => ({
  clearPidFile: mocks.clearPidFile,
  isProcessAlive: mocks.isProcessAlive,
  readPidFile: mocks.readPidFile,
}));

vi.mock("../../config/credentials.js", () => ({
  resetStoredCredentials: mocks.resetStoredCredentials,
}));

vi.mock("../../config/paths.js", () => ({
  resolvePaths: mocks.resolvePaths,
}));

describe("reset command", () => {
  const previousExitCode = process.exitCode;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.exitCode = undefined;

    mocks.resolvePaths.mockReturnValue({
      home: "/tmp/slashcash-home",
      db: "/tmp/slashcash-home/db.sqlite",
    });
    mocks.readPidFile.mockReturnValue(null);
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it("refuses to reset without confirmation", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { register } = await import("./reset.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["reset"], { from: "user" });

    expect(errorSpy).toHaveBeenCalledWith("Refusing to reset without --yes.");
    expect(process.exitCode).toBe(1);
    expect(mocks.resetStoredCredentials).not.toHaveBeenCalled();
  });

  it("wipes the local slash.cash state directory", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./reset.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["reset", "--yes"], { from: "user" });

    expect(mocks.resetStoredCredentials).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith(
      "Reset local slash.cash state. Run `slashcash onboard`.",
    );
    expect(mocks.rmSync).toHaveBeenCalledWith("/tmp/slashcash-home", {
      recursive: true,
      force: true,
    });
    expect(mocks.clearPidFile).toHaveBeenCalledOnce();
  });

  it("removes a custom db path outside the slashcash home", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.resolvePaths.mockReturnValue({
      home: "/tmp/slashcash-home",
      db: "/tmp/custom-db.sqlite",
    });

    const { register } = await import("./reset.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["reset", "--yes"], { from: "user" });

    expect(mocks.rmSync).toHaveBeenCalledWith("/tmp/custom-db.sqlite", {
      force: true,
    });
    expect(mocks.rmSync).toHaveBeenCalledWith("/tmp/slashcash-home", {
      recursive: true,
      force: true,
    });
    expect(logSpy).toHaveBeenCalledWith(
      "Reset local slash.cash state. Run `slashcash onboard`.",
    );
  });

  it("stops a running dashboard before deleting state", async () => {
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.readPidFile.mockReturnValue({ pid: 4321 });
    mocks.isProcessAlive.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const { register } = await import("./reset.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["reset", "--yes"], { from: "user" });

    expect(killSpy).toHaveBeenCalledWith(4321, "SIGTERM");
    expect(mocks.rmSync).toHaveBeenCalledWith("/tmp/slashcash-home", {
      recursive: true,
      force: true,
    });
  });
});
