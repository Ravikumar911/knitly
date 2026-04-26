import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export const DEFAULT_LOCAL_ASSISTANT_BASE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_LOCAL_ASSISTANT_CHAT_MODEL = "gemma4:latest";

export type AssistantProviderName =
  | "none"
  | "ollama-local"
  | "openai-compatible"
  | "anthropic";

export type AssistantConfig = {
  provider: AssistantProviderName;
  baseUrl: string;
  chatModel: string;
};

export type AssistantProviderStatus =
  | { model: LanguageModel; ready: true; config: AssistantConfig }
  | {
      model: null;
      ready: false;
      reason:
        | "no-assistant-provider"
        | "missing-api-key"
        | "anthropic-disabled"
        | "unknown-provider";
      config: AssistantConfig;
    };

type LocalConfig = {
  ai?: {
    ollamaBaseUrl?: string;
    chatModel?: string;
  };
  assistant?: Partial<AssistantConfig>;
};

type CredentialsFile = {
  assistant?: Record<string, { apiKey?: string }>;
};

export function chatModel(): LanguageModel {
  const provider = getAssistantProvider(resolveAssistantRuntimeConfig());
  if (!provider.ready) {
    throw new Error(provider.reason);
  }
  return provider.model;
}

export function getAssistantProvider(
  config: AssistantConfig = resolveAssistantRuntimeConfig(),
): AssistantProviderStatus {
  if (config.provider === "none") {
    return {
      model: null,
      ready: false,
      reason: "no-assistant-provider",
      config,
    };
  }

  if (config.provider === "anthropic") {
    if (process.env.SLASHCASH_ASSISTANT_ANTHROPIC !== "1") {
      return {
        model: null,
        ready: false,
        reason: "anthropic-disabled",
        config,
      };
    }
    const apiKey = resolveAssistantApiKey("anthropic");
    if (!apiKey) {
      return {
        model: null,
        ready: false,
        reason: "missing-api-key",
        config,
      };
    }
    return {
      model: createOpenAICompatible({
        name: "anthropic-compatible",
        baseURL: config.baseUrl,
        apiKey,
      })(config.chatModel),
      ready: true,
      config,
    };
  }

  const apiKey =
    config.provider === "openai-compatible"
      ? resolveAssistantApiKey("openai-compatible")
      : undefined;
  if (config.provider === "openai-compatible" && !apiKey) {
    return {
      model: null,
      ready: false,
      reason: "missing-api-key",
      config,
    };
  }

  if (
    config.provider === "ollama-local" ||
    config.provider === "openai-compatible"
  ) {
    return {
      model: createOpenAICompatible({
        name: config.provider,
        baseURL: config.baseUrl,
        apiKey,
      })(config.chatModel),
      ready: true,
      config,
    };
  }

  return {
    model: null,
    ready: false,
    reason: "unknown-provider",
    config,
  };
}

export function resolveAssistantRuntimeConfig(): AssistantConfig {
  const localConfig = readLocalConfig();
  const assistant = localConfig?.assistant;
  const legacyAi = localConfig?.ai;
  const provider =
    (process.env.SLASHCASH_ASSISTANT_PROVIDER as AssistantProviderName) ||
    assistant?.provider ||
    "none";

  return {
    provider,
    baseUrl:
      process.env.SLASHCASH_ASSISTANT_BASE_URL ||
      assistant?.baseUrl ||
      legacyAi?.ollamaBaseUrl ||
      DEFAULT_LOCAL_ASSISTANT_BASE_URL,
    chatModel:
      process.env.SLASHCASH_ASSISTANT_CHAT_MODEL ||
      assistant?.chatModel ||
      legacyAi?.chatModel ||
      DEFAULT_LOCAL_ASSISTANT_CHAT_MODEL,
  };
}

export function resolveAiRuntimeConfig() {
  const config = resolveAssistantRuntimeConfig();
  return {
    baseURL: config.baseUrl,
    chatModel: config.chatModel,
  };
}

function resolveAssistantApiKey(provider: "openai-compatible" | "anthropic") {
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  if (provider === "openai-compatible" && process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  try {
    const credentials = JSON.parse(
      readFileSync(join(resolveSlashcashHome(), "credentials.json"), "utf8"),
    ) as CredentialsFile;
    return credentials.assistant?.[provider]?.apiKey || undefined;
  } catch {
    return undefined;
  }
}

function readLocalConfig(): LocalConfig | null {
  try {
    const configPath = join(resolveSlashcashHome(), "config.json");
    return JSON.parse(readFileSync(configPath, "utf8")) as LocalConfig;
  } catch {
    return null;
  }
}

function resolveSlashcashHome() {
  return resolve(process.env.SLASHCASH_HOME || join(homedir(), ".slashcash"));
}
