import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  resolvePaths: vi.fn(),
  ensureStateDirs: vi.fn(),
  loadDatabase: vi.fn(),
  ensureLocalDatabase: vi.fn(),
  installBundledSkills: vi.fn(),
  ensurePythonEnvReady: vi.fn(),
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

vi.mock("../skills/registry.js", () => ({
  installBundledSkills: mocks.installBundledSkills,
}));

vi.mock("../python/env.js", () => ({
  ensurePythonEnvReady: mocks.ensurePythonEnvReady,
}));

describe("doctor repairs", () => {
  it("bootstraps state, config, skills, and database files in order", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const paths = {
      home: "/tmp/slashcash-home",
      config: "/tmp/slashcash-home/config.json",
      db: "/tmp/slashcash-home/db.sqlite",
      attachments: "/tmp/slashcash-home/attachments",
      cache: "/tmp/slashcash-home/cache",
      logs: "/tmp/slashcash-home/logs",
      skills: "/tmp/slashcash-home/skills",
      pyVenv: "/tmp/slashcash-home/py-venv",
      pyInstallHash: "/tmp/slashcash-home/py-venv/.slashcash.install-hash",
      pidDir: "/tmp/slashcash-home/pid",
      pidFile: "/tmp/slashcash-home/pid/slashcash.pid.json",
    };

    mocks.resolvePaths.mockReturnValue(paths);
    mocks.loadConfig.mockReturnValue({
      pdfExtractor: {
        enabled: true,
        timeoutMs: 30_000,
        pythonBin: "",
      },
    });
    mocks.loadDatabase.mockResolvedValue({
      ensureLocalDatabase: mocks.ensureLocalDatabase,
    });
    mocks.ensurePythonEnvReady.mockResolvedValue({
      ok: true,
      runtime: {
        pythonBin: "/tmp/slashcash-home/py-venv/bin/python",
      },
    });

    const { repairPhase1State } = await import("./repairs.js");
    await repairPhase1State();

    expect(mocks.ensureStateDirs).toHaveBeenCalledWith(paths);
    expect(mocks.loadConfig).toHaveBeenCalledWith({ createIfMissing: true });
    expect(mocks.installBundledSkills).toHaveBeenCalledOnce();
    expect(process.env.SQLITE_DB_PATH).toBe(paths.db);
    expect(mocks.ensureLocalDatabase).toHaveBeenCalledOnce();
    expect(mocks.ensurePythonEnvReady).toHaveBeenCalledOnce();
  });
});
