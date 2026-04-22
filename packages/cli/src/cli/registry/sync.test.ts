import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  resolvePaths: vi.fn(),
  loadDatabase: vi.fn(),
  loadEmailSync: vi.fn(),
  installBundledSkills: vi.fn(),
  isSkillEnabled: vi.fn(),
  ensureLocalDatabase: vi.fn(),
  runEmailSync: vi.fn(),
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

vi.mock("../../runtime/tasks.js", () => ({
  loadEmailSync: mocks.loadEmailSync,
}));

vi.mock("../../skills/registry.js", () => ({
  BUNDLED_GMAIL_SWIGGY_SKILL: "gmail-swiggy",
  installBundledSkills: mocks.installBundledSkills,
  isSkillEnabled: mocks.isSkillEnabled,
}));

vi.mock("picocolors", () => ({
  default: {
    green: (value: string) => `green(${value})`,
    yellow: (value: string) => `yellow(${value})`,
  },
}));

describe("sync command", () => {
  const paths = {
    home: "/tmp/slashcash-home",
    config: "/tmp/slashcash-home/config.json",
    db: "/tmp/slashcash-home/db.sqlite",
    attachments: "/tmp/slashcash-home/attachments",
    cache: "/tmp/slashcash-home/cache",
    logs: "/tmp/slashcash-home/logs",
    skills: "/tmp/slashcash-home/skills",
    pidDir: "/tmp/slashcash-home/pid",
    pidFile: "/tmp/slashcash-home/pid/slashcash.pid.json",
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.loadConfig.mockReturnValue({
      ai: {
        ollamaBaseUrl: "http://127.0.0.1:11434/v1",
        chatModel: "tiny-chat",
        visionModel: "tiny-vision",
      },
      sync: {
        gmailQuery: "label:slashcash",
        maxMessages: 25,
      },
    });
    mocks.resolvePaths.mockReturnValue(paths);
    mocks.loadDatabase.mockResolvedValue({
      ensureLocalDatabase: mocks.ensureLocalDatabase,
      LOCAL_USER_ID: "local-user-id",
    });
    mocks.loadEmailSync.mockResolvedValue({
      runEmailSync: mocks.runEmailSync,
    });
  });

  it("fails early when the Gmail sync skill is disabled", async () => {
    mocks.isSkillEnabled.mockReturnValue(false);
    const { register } = await import("./sync.js");
    const program = new Command();
    register(program);

    await expect(program.parseAsync(["sync"], { from: "user" })).rejects.toMatchObject({
      name: "CliError",
      block: expect.objectContaining({
        area: "config",
      }),
    });
    expect(mocks.installBundledSkills).toHaveBeenCalledOnce();
    expect(mocks.runEmailSync).not.toHaveBeenCalled();
  });

  it("runs a sync with overrides and reports a success summary", async () => {
    mocks.isSkillEnabled.mockReturnValue(true);
    mocks.runEmailSync.mockResolvedValue({
      processedCount: 4,
      skippedCount: 1,
      errorCount: 0,
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { register } = await import("./sync.js");
    const program = new Command();
    register(program);

    await program.parseAsync(
      ["sync", "--full", "--query", "label:finance", "--limit", "10"],
      { from: "user" },
    );

    expect(mocks.ensureLocalDatabase).toHaveBeenCalledOnce();
    expect(mocks.runEmailSync).toHaveBeenCalledWith({
      userId: "local-user-id",
      query: "label:finance",
      maxMessages: 10,
      full: true,
    });
    expect(process.env.SQLITE_DB_PATH).toBe(paths.db);
    expect(process.env.SLASHCASH_HOME).toBe(paths.home);
    expect(process.env.SLASHCASH_ATTACHMENTS_DIR).toBe(paths.attachments);
    expect(process.env.SLASHCASH_GMAIL_QUERY).toBe("label:finance");
    expect(process.env.SLASHCASH_SYNC_LIMIT).toBe("10");
    expect(logSpy).toHaveBeenCalledWith(
      "green(Sync complete: 4 processed, 1 skipped, 0 failed.)",
    );
  });

  it("warns when another sync is already running", async () => {
    mocks.isSkillEnabled.mockReturnValue(true);
    mocks.runEmailSync.mockResolvedValue({
      skipped: true,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { register } = await import("./sync.js");
    const program = new Command();
    register(program);

    await program.parseAsync(["sync"], { from: "user" });

    expect(logSpy).toHaveBeenCalledWith(
      "yellow(A sync is already running. Skipped this request.)",
    );
  });
});
