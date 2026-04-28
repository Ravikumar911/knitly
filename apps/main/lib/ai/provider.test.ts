import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
const keytarMock = vi.hoisted(() => ({
  getPassword: vi.fn(),
}));

vi.mock("keytar", () => ({
  getPassword: keytarMock.getPassword,
}));

afterEach(() => {
  process.env = { ...originalEnv };
  keytarMock.getPassword.mockReset();
  vi.resetModules();
});

describe("resolveChatModelForRequest", () => {
  const ollamaRuntime = {
    provider: "ollama-local" as const,
    baseUrl: "http://127.0.0.1:11434/v1",
    chatModel: "ignored-from-file",
  };

  it("returns the canonical model when the client omits model or sends whitespace", async () => {
    const { resolveChatModelForRequest } = await import("./provider.js");
    expect(resolveChatModelForRequest(undefined, ollamaRuntime)).toEqual({
      ok: true,
      chatModel: "gemma4:latest",
    });
    expect(resolveChatModelForRequest("", ollamaRuntime)).toEqual({
      ok: true,
      chatModel: "gemma4:latest",
    });
    expect(resolveChatModelForRequest("   ", ollamaRuntime)).toEqual({
      ok: true,
      chatModel: "gemma4:latest",
    });
  });

  it("accepts the client model when it matches the canonical id for the provider", async () => {
    const { resolveChatModelForRequest } = await import("./provider.js");
    expect(
      resolveChatModelForRequest("  claude-haiku-4-5  ", {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        chatModel: "claude-haiku-4-5",
      }),
    ).toEqual({ ok: true, chatModel: "claude-haiku-4-5" });
  });

  it("rejects a client model that does not match this provider", async () => {
    const { resolveChatModelForRequest } = await import("./provider.js");
    expect(
      resolveChatModelForRequest("gemma4:latest", {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        chatModel: "claude-haiku-4-5",
      }).ok,
    ).toBe(false);
  });

  it("rejects when provider is none", async () => {
    const { resolveChatModelForRequest, ASSISTANT_NOT_CONFIGURED_ERROR } =
      await import("./provider.js");
    expect(
      resolveChatModelForRequest(undefined, {
        provider: "none",
        baseUrl: "http://127.0.0.1:11434/v1",
        chatModel: "gemma4:latest",
      }),
    ).toEqual({ ok: false, error: ASSISTANT_NOT_CONFIGURED_ERROR });
  });
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

    const { resolveAssistantRuntimeConfig } = await import("./provider.js");

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

    const { getAssistantProvider } = await import("./provider.js");
    const provider = await getAssistantProvider();

    expect(provider.ready).toBe(false);
    if (!provider.ready) {
      expect(provider.reason).toBe("no-assistant-provider");
    }

    rmSync(home, { recursive: true, force: true });
  });

  it("treats anthropic as ready when config and credentials exist (no ANTHROPIC_API_KEY)", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-provider-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.ANTHROPIC_API_KEY;

    writeFileSync(
      join(home, "config.json"),
      `${JSON.stringify({
        assistant: {
          provider: "anthropic",
          baseUrl: "https://api.anthropic.com/v1",
          chatModel: "claude-haiku-4-5",
        },
      })}\n`,
    );
    writeFileSync(
      join(home, "credentials.json"),
      `${JSON.stringify({
        assistant: {
          anthropic: { apiKey: "sk-ant-api03-test-key" },
        },
      })}\n`,
    );

    const { getAssistantProvider } = await import("./provider.js");
    const provider = await getAssistantProvider();

    expect(provider.ready).toBe(true);

    rmSync(home, { recursive: true, force: true });
  });

  it("treats anthropic as ready when credentials are in Keychain", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-provider-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.ANTHROPIC_API_KEY;
    keytarMock.getPassword.mockResolvedValue("sk-ant-api03-keychain-key");

    writeFileSync(
      join(home, "config.json"),
      `${JSON.stringify({
        assistant: {
          provider: "anthropic",
          baseUrl: "https://api.anthropic.com/v1",
          chatModel: "claude-haiku-4-5",
        },
      })}\n`,
    );

    const { getAssistantProvider } = await import("./provider.js");
    const provider = await getAssistantProvider();

    expect(provider.ready).toBe(true);
    expect(keytarMock.getPassword).toHaveBeenCalledWith(
      "slashcash",
      "assistant-api-key@anthropic",
    );

    rmSync(home, { recursive: true, force: true });
  });

  it("normalizes assistant.chatModel to the canonical id for the provider", async () => {
    const home = mkdtempSync(join(tmpdir(), "slashcash-provider-"));
    process.env.SLASHCASH_HOME = home;
    delete process.env.SLASHCASH_ASSISTANT_CHAT_MODEL;

    writeFileSync(
      join(home, "config.json"),
      `${JSON.stringify({
        assistant: {
          provider: "ollama-local",
          baseUrl: "http://127.0.0.1:3302/v1",
          chatModel: "legacy-tag",
        },
      })}\n`,
    );

    const { getAssistantProvider, resolveAssistantRuntimeConfig } =
      await import("./provider.js");
    const provider = await getAssistantProvider(
      resolveAssistantRuntimeConfig(),
    );

    expect(provider.ready).toBe(true);
    expect(provider.config.chatModel).toBe("gemma4:latest");

    rmSync(home, { recursive: true, force: true });
  });
});
