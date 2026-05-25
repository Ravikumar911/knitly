import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAssistantCredential: vi.fn(),
  createOpenAICompatible: vi.fn(),
  loadConfig: vi.fn(),
  readAssistantCredential: vi.fn(),
  streamText: vi.fn(),
  writeAssistantCredential: vi.fn(),
  writeConfig: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: mocks.streamText,
}));

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: mocks.createOpenAICompatible,
}));

vi.mock("../../config/credentials.js", () => ({
  clearAssistantCredential: mocks.clearAssistantCredential,
  readAssistantCredential: mocks.readAssistantCredential,
  writeAssistantCredential: mocks.writeAssistantCredential,
}));

vi.mock("../../config/load.js", () => ({
  loadConfig: mocks.loadConfig,
  writeConfig: mocks.writeConfig,
}));

describe("assistant command helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.createOpenAICompatible.mockReturnValue((model: string) => ({
      model,
      provider: "test",
    }));
    mocks.streamText.mockReturnValue({
      textStream: textStream("ok"),
    });
  });

  it("streams a tiny prompt when testing a hosted provider", async () => {
    mocks.loadConfig.mockReturnValue({
      assistant: {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        chatModel: "claude-haiku-4-5",
      },
    });
    mocks.readAssistantCredential.mockResolvedValue({
      provider: "anthropic",
      apiKey: "sk-ant-test",
      store: "file",
    });

    const { testAssistantProvider } = await import("./assistant.js");
    await testAssistantProvider();

    expect(mocks.createOpenAICompatible).toHaveBeenCalledWith({
      name: "anthropic-compatible",
      baseURL: "https://api.anthropic.com/v1",
      apiKey: "sk-ant-test",
    });
    expect(mocks.streamText).toHaveBeenCalledWith({
      model: { model: "claude-haiku-4-5", provider: "test" },
      system: "Reply with exactly: ok",
      prompt: "Say ok.",
      maxOutputTokens: 8,
    });
  });

  it("does not leak hosted API keys in status output", async () => {
    mocks.loadConfig.mockReturnValue({
      assistant: {
        provider: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        chatModel: "gpt-5.4-mini",
      },
    });
    mocks.readAssistantCredential.mockResolvedValue({
      provider: "openai-compatible",
      apiKey: "sk-secret",
      store: "file",
    });

    const { assistantStatus } = await import("./assistant.js");
    await expect(assistantStatus()).resolves.toEqual({
      provider: "openai-compatible",
      ready: true,
      reason: null,
      model: "gpt-5.4-mini",
      baseUrl: "https://api.openai.com/v1",
    });
  });

  it("fails before streaming when a hosted provider is missing credentials", async () => {
    mocks.loadConfig.mockReturnValue({
      assistant: {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        chatModel: "claude-haiku-4-5",
      },
    });
    mocks.readAssistantCredential.mockResolvedValue(null);

    const { testAssistantProvider } = await import("./assistant.js");
    await expect(testAssistantProvider()).rejects.toThrow("missing-api-key");

    expect(mocks.createOpenAICompatible).not.toHaveBeenCalled();
    expect(mocks.streamText).not.toHaveBeenCalled();
  });
});

async function* textStream(text: string) {
  yield text;
}
