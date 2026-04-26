import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("resolveAssistantRuntimeConfig", () => {
  it("falls back to the local slashcash assistant config", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-provider-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.SLASHCASH_ASSISTANT_BASE_URL;
    delete process.env.SLASHCASH_ASSISTANT_CHAT_MODEL;

    writeFileSync(
      join(home, "config.json"),
      `${JSON.stringify({
        assistant: {
          provider: "ollama-local",
          baseUrl: "http://127.0.0.1:3302/v1",
          chatModel: "mock-swiggy",
        },
      })}\n`,
    );

    const { resolveAssistantRuntimeConfig } = await import("./provider");

    expect(resolveAssistantRuntimeConfig()).toEqual({
      provider: "ollama-local",
      baseUrl: "http://127.0.0.1:3302/v1",
      chatModel: "mock-swiggy",
    });

    rmSync(home, { recursive: true, force: true });
  });

  it("defaults to no provider until configured", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-provider-"));
    process.env.SLASHCASH_HOME = home;
    writeFileSync(join(home, "config.json"), "{}\n");

    const { getAssistantProvider } = await import("./provider");
    const provider = getAssistantProvider();

    expect(provider.ready).toBe(false);
    if (!provider.ready) {
      expect(provider.reason).toBe("no-assistant-provider");
    }

    rmSync(home, { recursive: true, force: true });
  });
});
