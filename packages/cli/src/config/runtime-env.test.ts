import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "./schema.js";

vi.mock("./credentials.js", () => ({
  readStoredCredentials: vi.fn(),
}));

describe("applyRuntimeEnv", () => {
  afterEach(() => {
    delete process.env.SQLITE_DB_PATH;
    delete process.env.SLASHCASH_HOME;
    delete process.env.SLASHCASH_ATTACHMENTS_DIR;
    delete process.env.SLASHCASH_GMAIL_QUERY;
    delete process.env.SLASHCASH_SYNC_LIMIT;
    delete process.env.SLASHCASH_IMAP_SERVER;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_CHAT_MODEL;
    delete process.env.OLLAMA_VISION_MODEL;
    delete process.env.SLASHCASH_IMAP_FIXTURE_DIR;
  });

  it("preserves explicit OLLAMA env overrides", async () => {
    process.env.SLASHCASH_IMAP_FIXTURE_DIR = "/tmp/imap-fixtures";
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:3302/v1";
    process.env.OLLAMA_CHAT_MODEL = "mock-swiggy";
    process.env.OLLAMA_VISION_MODEL = "mock-swiggy";

    const { applyRuntimeEnv } = await import("./runtime-env.js");

    await applyRuntimeEnv({
      config: defaultConfig,
      paths: {
        home: "/tmp/slashcash-home",
        config: "/tmp/slashcash-home/config.json",
        credentials: "/tmp/slashcash-home/credentials.json",
        db: "/tmp/slashcash-home/db.sqlite",
        attachments: "/tmp/slashcash-home/attachments",
        cache: "/tmp/slashcash-home/cache",
        logs: "/tmp/slashcash-home/logs",
        skills: "/tmp/slashcash-home/skills",
        pidDir: "/tmp/slashcash-home/pid",
        pidFile: "/tmp/slashcash-home/pid/slashcash.pid.json",
      },
    });

    expect(process.env.OLLAMA_BASE_URL).toBe("http://127.0.0.1:3302/v1");
    expect(process.env.OLLAMA_CHAT_MODEL).toBe("mock-swiggy");
    expect(process.env.OLLAMA_VISION_MODEL).toBe("mock-swiggy");
    expect(process.env.SQLITE_DB_PATH).toBe("/tmp/slashcash-home/db.sqlite");
  });
});
