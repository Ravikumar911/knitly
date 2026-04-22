import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accessSync: vi.fn(),
  loadConfig: vi.fn(),
  resolvePaths: vi.fn(),
  ensureStateDirs: vi.fn(),
  loadDatabase: vi.fn(),
  ensureLocalDatabase: vi.fn(),
  commandExists: vi.fn(),
  runCommand: vi.fn(),
  installBundledSkills: vi.fn(),
  listInstalledSkills: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  accessSync: mocks.accessSync,
}));

vi.mock("../config/load.js", () => ({
  loadConfig: mocks.loadConfig,
}));

vi.mock("../config/paths.js", () => ({
  resolvePaths: mocks.resolvePaths,
  ensureStateDirs: mocks.ensureStateDirs,
}));

vi.mock("../runtime/database.js", () => ({
  loadDatabase: mocks.loadDatabase,
}));

vi.mock("../runtime/subprocess.js", () => ({
  commandExists: mocks.commandExists,
  runCommand: mocks.runCommand,
}));

vi.mock("../skills/registry.js", () => ({
  installBundledSkills: mocks.installBundledSkills,
  listInstalledSkills: mocks.listInstalledSkills,
}));

describe("doctor checks", () => {
  const previousSkipOllama = process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA;

    mocks.resolvePaths.mockReturnValue({
      home: "/tmp/slashcash-home",
      config: "/tmp/slashcash-home/config.json",
      db: "/tmp/slashcash-home/db.sqlite",
      attachments: "/tmp/slashcash-home/attachments",
      cache: "/tmp/slashcash-home/cache",
      logs: "/tmp/slashcash-home/logs",
      skills: "/tmp/slashcash-home/skills",
      pidDir: "/tmp/slashcash-home/pid",
      pidFile: "/tmp/slashcash-home/pid/slashcash.pid.json",
    });
    mocks.loadConfig.mockReturnValue({
      ai: {
        ollamaBaseUrl: "http://127.0.0.1:11434/v1",
        chatModel: "tiny-chat",
      },
      sync: {
        schedule: "*/15 * * * *",
      },
    });
    mocks.loadDatabase.mockResolvedValue({
      ensureLocalDatabase: mocks.ensureLocalDatabase,
    });
    mocks.listInstalledSkills.mockReturnValue([
      {
        id: "gmail-swiggy",
        enabled: true,
        manifest: {
          requires: { bins: [] },
        },
      },
    ]);
    mocks.commandExists.mockReturnValue(true);
    mocks.accessSync.mockImplementation(() => {});
  });

  afterEach(() => {
    if (previousSkipOllama === undefined) {
      delete process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA;
    } else {
      process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA = previousSkipOllama;
    }
  });

  it("runs the local filesystem and schema checks in quick mode", async () => {
    const { runChecks } = await import("./checks.js");
    const checks = await runChecks({ quick: true });

    expect(checks.map((check) => check.id)).toEqual([
      "node",
      "state-dir",
      "config",
      "sync-schedule",
      "sqlite",
      "skills",
    ]);
    expect(checks.every((check) => check.status === "ok")).toBe(true);
    expect(mocks.installBundledSkills).not.toHaveBeenCalled();
    expect(process.env.SQLITE_DB_PATH).toBe("/tmp/slashcash-home/db.sqlite");
  });

  it("adds the skipped Ollama check and installs bundled skills when fixing", async () => {
    process.env.SLASHCASH_DOCTOR_SKIP_OLLAMA = "1";

    const { runChecks } = await import("./checks.js");
    const checks = await runChecks({ fix: true });

    expect(mocks.ensureStateDirs).toHaveBeenCalled();
    expect(mocks.installBundledSkills).toHaveBeenCalledOnce();
    expect(checks.map((check) => check.id)).toEqual([
      "node",
      "state-dir",
      "config",
      "sync-schedule",
      "sqlite",
      "skills",
      "ollama",
    ]);
    expect(checks.find((check) => check.id === "ollama")).toMatchObject({
      status: "ok",
      message: "Skipped by environment",
    });
  });
});
