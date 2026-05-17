import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "../config/schema.js";

const mocks = vi.hoisted(() => ({
  listInstalledSkills: vi.fn(),
  isSkillEnabled: vi.fn(),
  applyRuntimeEnv: vi.fn(),
  writeLog: vi.fn(),
  loadDatabase: vi.fn(),
  loadEmailSync: vi.fn(),
  ensureLocalDatabase: vi.fn(),
  runEmailSync: vi.fn(),
}));

vi.mock("./registry.js", () => ({
  listInstalledSkills: mocks.listInstalledSkills,
  isSkillEnabled: mocks.isSkillEnabled,
}));

vi.mock("../config/runtime-env.js", () => ({
  applyRuntimeEnv: mocks.applyRuntimeEnv,
}));

vi.mock("../runtime/log.js", () => ({
  writeLog: mocks.writeLog,
}));

vi.mock("../runtime/database.js", () => ({
  loadDatabase: mocks.loadDatabase,
}));

vi.mock("../runtime/tasks.js", () => ({
  loadEmailSync: mocks.loadEmailSync,
}));

describe("skill jobs", () => {
  const envKeys = [
    "SQLITE_DB_PATH",
    "SLASHCASH_HOME",
    "SLASHCASH_ATTACHMENTS_DIR",
    "SLASHCASH_GMAIL_QUERY",
    "SLASHCASH_SYNC_LIMIT",
    "SLASHCASH_IMAP_SERVER",
    "SLASHCASH_ASSISTANT_PROVIDER",
    "SLASHCASH_ASSISTANT_BASE_URL",
    "SLASHCASH_ASSISTANT_CHAT_MODEL",
    "SLASHCASH_PDF_EXTRACTOR_PYTHON",
    "SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS",
  ] as const;

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

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.loadDatabase.mockResolvedValue({
      ensureLocalDatabase: mocks.ensureLocalDatabase,
      LOCAL_USER_ID: "local-user-id",
    });
    mocks.applyRuntimeEnv.mockImplementation(async ({ config, paths }) => {
      process.env.SQLITE_DB_PATH = paths.db;
      process.env.SLASHCASH_HOME = paths.home;
      process.env.SLASHCASH_ATTACHMENTS_DIR = paths.attachments;
      process.env.SLASHCASH_GMAIL_QUERY = config.sync.gmailQuery;
      process.env.SLASHCASH_SYNC_LIMIT = String(config.sync.maxMessages);
      process.env.SLASHCASH_IMAP_SERVER = config.gmail.imapServer;
      process.env.SLASHCASH_ASSISTANT_PROVIDER = config.assistant.provider;
      process.env.SLASHCASH_ASSISTANT_BASE_URL = config.assistant.baseUrl;
      process.env.SLASHCASH_ASSISTANT_CHAT_MODEL = config.assistant.chatModel;
      process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON =
        config.pdfExtractor.pythonBin || `${paths.pyVenv}/bin/python`;
      process.env.SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS = String(
        config.pdfExtractor.timeoutMs,
      );
    });
    mocks.loadEmailSync.mockResolvedValue({
      runEmailSync: mocks.runEmailSync,
    });
  });

  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("builds registrations with explicit and fallback schedules", async () => {
    mocks.listInstalledSkills.mockReturnValue([
      {
        id: "gmail-swiggy",
        dir: "/skills/gmail-swiggy",
        enabled: true,
        manifest: {
          id: "gmail-swiggy",
          name: "Gmail Swiggy",
          version: "1.0.0",
          category: "sync",
          description: "",
          requires: { bins: [] },
          jobs: [
            { id: "default-sync", handler: "runEmailSync" },
            {
              id: "hourly-sync",
              handler: "runEmailSync",
              schedule: "0 * * * *",
              mutexKey: "hourly-sync-lock",
            },
          ],
        },
      },
    ]);

    const { buildSkillJobRegistrations } = await import("./jobs.js");
    const registrations = buildSkillJobRegistrations(defaultConfig, paths);

    expect(
      registrations.map((job) => ({
        id: job.id,
        schedule: job.schedule,
        mutexKey: job.mutexKey,
      })),
    ).toEqual([
      {
        id: "gmail-swiggy:default-sync",
        schedule: defaultConfig.sync.schedule,
        mutexKey: "gmail-swiggy:default-sync",
      },
      {
        id: "gmail-swiggy:hourly-sync",
        schedule: "0 * * * *",
        mutexKey: "hourly-sync-lock",
      },
    ]);
  });

  it("runs enabled email-sync jobs with the expected environment", async () => {
    mocks.listInstalledSkills.mockReturnValue([
      {
        id: "gmail-swiggy",
        dir: "/skills/gmail-swiggy",
        enabled: true,
        manifest: {
          id: "gmail-swiggy",
          name: "Gmail Swiggy",
          version: "1.0.0",
          category: "sync",
          description: "",
          requires: { bins: [] },
          jobs: [{ id: "sync", handler: "runEmailSync" }],
        },
      },
    ]);
    mocks.isSkillEnabled.mockReturnValue(true);
    mocks.runEmailSync.mockResolvedValue({
      processedCount: 4,
      skippedCount: 1,
      errorCount: 0,
    });

    const { buildSkillJobRegistrations } = await import("./jobs.js");
    const registrations = buildSkillJobRegistrations(
      {
        ...defaultConfig,
        assistant: {
          provider: "ollama-local",
          baseUrl: "http://127.0.0.1:11434/v1",
          chatModel: "tiny-chat",
        },
        sync: {
          schedule: "*/10 * * * *",
          gmailQuery: "label:finance",
          maxMessages: 25,
          concurrency: {
            fetch: 4,
            extract: 4,
            write: 1,
          },
        },
        gmail: {
          address: "user@gmail.com",
          passwordStore: "keychain",
          imapServer: "imap.gmail.com:993",
        },
      },
      paths,
    );

    await registrations[0]!.run();

    expect(mocks.ensureLocalDatabase).toHaveBeenCalledOnce();
    expect(mocks.runEmailSync).toHaveBeenCalledWith({
      userId: "local-user-id",
      query: "label:finance",
      maxMessages: 25,
    });
    expect(process.env.SQLITE_DB_PATH).toBe(paths.db);
    expect(process.env.SLASHCASH_HOME).toBe(paths.home);
    expect(process.env.SLASHCASH_ATTACHMENTS_DIR).toBe(paths.attachments);
    expect(process.env.SLASHCASH_GMAIL_QUERY).toBe("label:finance");
    expect(process.env.SLASHCASH_SYNC_LIMIT).toBe("25");
    expect(process.env.SLASHCASH_IMAP_SERVER).toBe("imap.gmail.com:993");
    expect(process.env.SLASHCASH_ASSISTANT_PROVIDER).toBe("ollama-local");
    expect(process.env.SLASHCASH_ASSISTANT_CHAT_MODEL).toBe("tiny-chat");
    expect(mocks.writeLog).toHaveBeenCalledWith("cron", {
      event: "sync",
      skillId: "gmail-swiggy",
      processedCount: 4,
      skippedCount: 1,
      errorCount: 0,
    });
  });

  it("skips disabled skills without touching the database or task runtime", async () => {
    mocks.listInstalledSkills.mockReturnValue([
      {
        id: "gmail-swiggy",
        dir: "/skills/gmail-swiggy",
        enabled: false,
        manifest: {
          id: "gmail-swiggy",
          name: "Gmail Swiggy",
          version: "1.0.0",
          category: "sync",
          description: "",
          requires: { bins: [] },
          jobs: [{ id: "sync", handler: "runEmailSync" }],
        },
      },
    ]);
    mocks.isSkillEnabled.mockReturnValue(false);

    const { buildSkillJobRegistrations } = await import("./jobs.js");
    const registrations = buildSkillJobRegistrations(defaultConfig, paths);

    await registrations[0]!.run();

    expect(mocks.loadDatabase).not.toHaveBeenCalled();
    expect(mocks.loadEmailSync).not.toHaveBeenCalled();
    expect(mocks.applyRuntimeEnv).not.toHaveBeenCalled();
    expect(mocks.writeLog).toHaveBeenCalledWith("cron", {
      event: "skipped",
      skillId: "gmail-swiggy",
      reason: "skill disabled",
    });
  });
});
