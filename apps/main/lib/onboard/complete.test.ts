import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultConfig } from "@workspace/tasks/local-state";
import { isOnboardComplete } from "./complete";

const homes: string[] = [];

afterEach(() => {
  for (const home of homes.splice(0)) {
    rmSync(home, { recursive: true, force: true });
  }
  delete process.env.SLASHCASH_HOME;
  delete process.env.SQLITE_DB_PATH;
  delete process.env.SLASHCASH_E2E;
});

function tempHome() {
  const home = mkdtempSync(join(tmpdir(), "slashcash-onboard-complete-"));
  homes.push(home);
  process.env.SLASHCASH_HOME = home;
  process.env.SQLITE_DB_PATH = join(home, "db.sqlite");
  return home;
}

describe("isOnboardComplete", () => {
  it("is false when config is missing", async () => {
    tempHome();
    expect(await isOnboardComplete()).toBe(false);
  });

  it("is false when assistant is none", async () => {
    const home = tempHome();
    mkdirSync(home, { recursive: true });
    writeFileSync(
      join(home, "config.json"),
      JSON.stringify({
        ...defaultConfig,
        assistant: { ...defaultConfig.assistant, provider: "none" },
      }),
    );
    expect(await isOnboardComplete()).toBe(false);
  });

  it("is true in E2E mode when config and db exist", async () => {
    const home = tempHome();
    process.env.SLASHCASH_E2E = "1";
    mkdirSync(home, { recursive: true });
    writeFileSync(
      join(home, "config.json"),
      JSON.stringify({
        ...defaultConfig,
        assistant: {
          ...defaultConfig.assistant,
          provider: "ollama-local",
          chatModel: "gemma4:latest",
          baseUrl: "http://127.0.0.1:11434/v1",
        },
      }),
    );
    writeFileSync(join(home, "db.sqlite"), "");
    expect(await isOnboardComplete()).toBe(true);
  });
});
