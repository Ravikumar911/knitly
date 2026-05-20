import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rmSync: vi.fn(),
  loadConfig: vi.fn(),
  resolvePaths: vi.fn(),
  loadDatabase: vi.fn(),
  ensureLocalDatabase: vi.fn(),
  clearLocalSeedData: vi.fn(),
  seedLocalDatabase: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  rmSync: mocks.rmSync,
}));

vi.mock("../../config/load.js", () => ({
  loadConfig: mocks.loadConfig,
}));

vi.mock("../../config/paths.js", () => ({
  resolvePaths: mocks.resolvePaths,
}));

vi.mock("../../runtime/database.js", () => ({
  loadDatabase: mocks.loadDatabase,
}));

describe("db command", () => {
  const previousExitCode = process.exitCode;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.exitCode = undefined;
    mocks.resolvePaths.mockReturnValue({
      attachments: "/tmp/slashcash-home/attachments",
      db: "/tmp/slashcash-home/db.sqlite",
    });
    mocks.loadDatabase.mockResolvedValue({
      ensureLocalDatabase: mocks.ensureLocalDatabase,
      clearLocalSeedData: mocks.clearLocalSeedData,
      seedLocalDatabase: mocks.seedLocalDatabase,
    });
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
  });

  it("seeds the local database", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./db.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["db", "seed"], { from: "user" });

    expect(mocks.loadConfig).toHaveBeenCalledWith({ createIfMissing: true });
    expect(process.env.SQLITE_DB_PATH).toBe("/tmp/slashcash-home/db.sqlite");
    expect(mocks.ensureLocalDatabase).toHaveBeenCalled();
    expect(mocks.seedLocalDatabase).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Seeded local Swiggy data.");
  });

  it("refuses to reset the database without confirmation", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { register } = await import("./db.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["db", "reset"], { from: "user" });

    expect(errorSpy).toHaveBeenCalledWith("Refusing to reset without --yes.");
    expect(process.exitCode).toBe(1);
    expect(mocks.rmSync).not.toHaveBeenCalled();
  });

  it("clears attachments and leaves an empty database by default", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./db.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["db", "reset", "--yes"], { from: "user" });

    expect(mocks.rmSync).toHaveBeenCalledWith("/tmp/slashcash-home/attachments", {
      recursive: true,
      force: true,
    });
    expect(mocks.clearLocalSeedData).toHaveBeenCalled();
    expect(mocks.ensureLocalDatabase).toHaveBeenCalled();
    expect(mocks.seedLocalDatabase).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "Reset local database and attachments. Run `slashcash sync --full` to ingest Gmail again.",
    );
  });

  it("reseeds demo data when --seed is provided", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("./db.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["db", "reset", "--yes", "--seed"], { from: "user" });

    expect(mocks.seedLocalDatabase).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Reset and seeded local demo data.");
  });
});
