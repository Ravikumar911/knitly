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

/**
 * Single supported chat model id per assistant provider (product surface).
 * Config/env may still store other strings for migration; runtime uses these.
 */
export const ASSISTANT_CANONICAL_CHAT_MODEL = {
  "ollama-local": "gemma4:latest",
  "openai-compatible": "gpt-5.4-mini",
  anthropic: "claude-haiku-4-5",
} as const satisfies Record<Exclude<AssistantProviderName, "none">, string>;

/** Ids allowed on `model` in POST /api/assistant/stream (Zod). */
export const ASSISTANT_STREAM_CHAT_MODEL_IDS = [
  ASSISTANT_CANONICAL_CHAT_MODEL["ollama-local"],
  ASSISTANT_CANONICAL_CHAT_MODEL["openai-compatible"],
  ASSISTANT_CANONICAL_CHAT_MODEL.anthropic,
] as const;

export const ASSISTANT_NOT_CONFIGURED_ERROR = "assistant not configured";

function withCanonicalChatModel(config: AssistantConfig): AssistantConfig {
  if (config.provider === "none") {
    return config;
  }
  return {
    ...config,
    chatModel: ASSISTANT_CANONICAL_CHAT_MODEL[config.provider],
  };
}

/**
 * Validate optional client `model` and return the canonical id for this provider.
 */
export function resolveChatModelForRequest(
  requested: string | undefined,
  runtime: AssistantConfig,
): { ok: true; chatModel: string } | { ok: false; error: string } {
  if (runtime.provider === "none") {
    return { ok: false, error: ASSISTANT_NOT_CONFIGURED_ERROR };
  }
  const canonical = ASSISTANT_CANONICAL_CHAT_MODEL[runtime.provider];
  const raw = requested?.trim();
  if (raw && raw.length > 0 && raw !== canonical) {
    return {
      ok: false,
      error: `unsupported model (use ${canonical} for this provider)`,
    };
  }
  return { ok: true, chatModel: canonical };
}

export type AssistantProviderStatus =
  | { model: LanguageModel; ready: true; config: AssistantConfig }
  | {
      model: null;
      ready: false;
      reason: "no-assistant-provider" | "missing-api-key" | "unknown-provider";
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

type KeytarModule = {
  getPassword(service: string, account: string): Promise<string | null>;
};

const KEYCHAIN_SERVICE = "slashcash";

export async function chatModel(): Promise<LanguageModel> {
  const provider = await getAssistantProvider(resolveAssistantRuntimeConfig());
  if (!provider.ready) {
    throw new Error(provider.reason);
  }
  return provider.model;
}

export async function getAssistantProvider(
  config: AssistantConfig = resolveAssistantRuntimeConfig(),
): Promise<AssistantProviderStatus> {
  const effective = withCanonicalChatModel(config);

  if (effective.provider === "none") {
    return {
      model: null,
      ready: false,
      reason: "no-assistant-provider",
      config: effective,
    };
  }

  if (effective.provider === "anthropic") {
    const apiKey = await resolveAssistantApiKey("anthropic");
    if (!apiKey) {
      return {
        model: null,
        ready: false,
        reason: "missing-api-key",
        config: effective,
      };
    }
    return {
      model: createOpenAICompatible({
        name: "anthropic-compatible",
        baseURL: effective.baseUrl,
        apiKey,
      })(effective.chatModel),
      ready: true,
      config: effective,
    };
  }

  const apiKey =
    effective.provider === "openai-compatible"
      ? await resolveAssistantApiKey("openai-compatible")
      : undefined;
  if (effective.provider === "openai-compatible" && !apiKey) {
    return {
      model: null,
      ready: false,
      reason: "missing-api-key",
      config: effective,
    };
  }

  if (
    effective.provider === "ollama-local" ||
    effective.provider === "openai-compatible"
  ) {
    return {
      model: createOpenAICompatible({
        name: effective.provider,
        baseURL: effective.baseUrl,
        apiKey,
      })(effective.chatModel),
      ready: true,
      config: effective,
    };
  }

  return {
    model: null,
    ready: false,
    reason: "unknown-provider",
    config: effective,
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

async function resolveAssistantApiKey(
  provider: "openai-compatible" | "anthropic",
) {
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
    const fileApiKey = credentials.assistant?.[provider]?.apiKey?.trim();
    if (fileApiKey) {
      return fileApiKey;
    }
  } catch {
    // Missing/invalid plaintext credentials are fine; Keychain is preferred.
  }
  return readKeychainAssistantApiKey(provider);
}

async function readKeychainAssistantApiKey(
  provider: "openai-compatible" | "anthropic",
) {
  try {
    const imported = await import("keytar");
    const candidate = (
      imported as { default?: Partial<KeytarModule> } & Partial<KeytarModule>
    ).getPassword
      ? (imported as Partial<KeytarModule>)
      : imported.default;
    if (!candidate || typeof candidate.getPassword !== "function") {
      return undefined;
    }
    return (
      (await candidate.getPassword(
        KEYCHAIN_SERVICE,
        `assistant-api-key@${provider}`,
      )) || undefined
    );
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
