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

export class ExtractionModelUnavailable extends Error {
  readonly reason:
    | "no-assistant-provider"
    | "missing-api-key"
    | "unknown-provider";
  readonly config: AssistantConfig;

  constructor(
    reason: ExtractionModelUnavailable["reason"],
    config: AssistantConfig,
  ) {
    super(`Extraction model unavailable: ${reason}`);
    this.name = "ExtractionModelUnavailable";
    this.reason = reason;
    this.config = config;
  }
}

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

export function resolveExtractionModel(): {
  model: LanguageModel;
  config: AssistantConfig;
} {
  const config = resolveAssistantRuntimeConfig();
  if (config.provider === "none") {
    throw new ExtractionModelUnavailable("no-assistant-provider", config);
  }

  const apiKey =
    config.provider === "openai-compatible" || config.provider === "anthropic"
      ? resolveAssistantApiKey(config.provider)
      : undefined;
  if (
    (config.provider === "openai-compatible" ||
      config.provider === "anthropic") &&
    !apiKey
  ) {
    throw new ExtractionModelUnavailable("missing-api-key", config);
  }

  if (
    config.provider === "ollama-local" ||
    config.provider === "openai-compatible" ||
    config.provider === "anthropic"
  ) {
    return {
      model: createOpenAICompatible({
        name:
          config.provider === "anthropic"
            ? "anthropic-compatible"
            : config.provider,
        baseURL: config.baseUrl,
        apiKey,
        // Plain-text JSON extraction; Anthropic rejects min/max on number schemas.
        supportsStructuredOutputs: false,
      })(config.chatModel),
      config,
    };
  }

  throw new ExtractionModelUnavailable("unknown-provider", config);
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
