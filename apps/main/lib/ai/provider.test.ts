import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("resolveAiRuntimeConfig", () => {
  it("falls back to the local slashcash config when env vars are unset", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-provider-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_CHAT_MODEL;

    writeFileSync(
      join(home, "config.json"),
      `${JSON.stringify({
        ai: {
          ollamaBaseUrl: "http://127.0.0.1:3302/v1",
          chatModel: "mock-swiggy",
        },
      })}\n`,
    );

    const { resolveAiRuntimeConfig } = await import("./provider");

    expect(resolveAiRuntimeConfig()).toEqual({
      baseURL: "http://127.0.0.1:3302/v1",
      chatModel: "mock-swiggy",
    });

    rmSync(home, { recursive: true, force: true });
  });

  it("prefers explicit env vars over the local config file", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-provider-"));
    process.env.SLASHCASH_HOME = home;
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:4400/v1";
    process.env.OLLAMA_CHAT_MODEL = "env-model";

    writeFileSync(
      join(home, "config.json"),
      `${JSON.stringify({
        ai: {
          ollamaBaseUrl: "http://127.0.0.1:3302/v1",
          chatModel: "mock-swiggy",
        },
      })}\n`,
    );

    const { resolveAiRuntimeConfig } = await import("./provider");

    expect(resolveAiRuntimeConfig()).toEqual({
      baseURL: "http://127.0.0.1:4400/v1",
      chatModel: "env-model",
    });

    rmSync(home, { recursive: true, force: true });
  });
});
