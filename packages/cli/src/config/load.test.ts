import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "./schema.js";
import { getConfigValue, loadConfig, setConfigValue } from "./load.js";
import { ensureStateDirs, resolvePaths } from "./paths.js";

describe("config loader", () => {
  const previousHome = process.env.SLASHCASH_HOME;
  const previousDbPath = process.env.SQLITE_DB_PATH;
  let home = "";

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "slashcash-cli-config-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.SQLITE_DB_PATH;
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.SLASHCASH_HOME;
    } else {
      process.env.SLASHCASH_HOME = previousHome;
    }

    if (previousDbPath === undefined) {
      delete process.env.SQLITE_DB_PATH;
    } else {
      process.env.SQLITE_DB_PATH = previousDbPath;
    }

    rmSync(home, { recursive: true, force: true });
  });

  it("creates and persists the default config when requested", () => {
    const config = loadConfig({ createIfMissing: true });
    const paths = resolvePaths();

    expect(config).toEqual(defaultConfig);
    expect(JSON.parse(readFileSync(paths.config, "utf8"))).toEqual(defaultConfig);
  });

  it("rewrites incomplete config files with schema defaults", () => {
    const paths = resolvePaths();
    ensureStateDirs(paths);
    writeFileSync(
      paths.config,
      `${JSON.stringify({
        server: { port: 4010 },
        ai: { chatModel: "tiny-local" },
        sync: { gmailQuery: "label:slashcash" },
      }, null, 2)}\n`,
    );

    const config = loadConfig();
    const persisted = JSON.parse(readFileSync(paths.config, "utf8"));

    expect(config).toMatchObject({
      server: { host: "127.0.0.1", port: 4010 },
      ai: {
        ollamaBaseUrl: "http://127.0.0.1:11434/v1",
        chatModel: "tiny-local",
        visionModel: "gemma3n:e4b",
      },
      sync: {
        schedule: "*/15 * * * *",
        gmailQuery: "label:slashcash",
        maxMessages: 50,
      },
      updates: { checkOnVersion: false },
    });
    expect(persisted).toEqual(config);
  });

  it("coerces nested values when setting config fields", () => {
    setConfigValue("server.port", "4242");
    setConfigValue("updates.checkOnVersion", "true");
    setConfigValue("ai.chatModel", "tiny-local");

    expect(getConfigValue("server.port")).toBe(4242);
    expect(getConfigValue("updates.checkOnVersion")).toBe(true);
    expect(getConfigValue("ai.chatModel")).toBe("tiny-local");
  });

  it("rejects empty config paths", () => {
    expect(() => setConfigValue("", "value")).toThrow("Config path is required.");
  });
});
