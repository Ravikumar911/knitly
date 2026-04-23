import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_OLLAMA_CHAT_MODEL = "gemma3n:e4b";

type LocalAiConfig = {
  ollamaBaseUrl?: string;
  chatModel?: string;
};

export function chatModel(): LanguageModel {
  const config = resolveAiRuntimeConfig();
  return createOpenAICompatible({
    name: "ollama",
    baseURL: config.baseURL,
  })(config.chatModel);
}

export function resolveAiRuntimeConfig() {
  const localConfig = readLocalAiConfig();

  return {
    baseURL:
      process.env.OLLAMA_BASE_URL ||
      localConfig?.ollamaBaseUrl ||
      DEFAULT_OLLAMA_BASE_URL,
    chatModel:
      process.env.OLLAMA_CHAT_MODEL ||
      localConfig?.chatModel ||
      DEFAULT_OLLAMA_CHAT_MODEL,
  };
}

function readLocalAiConfig(): LocalAiConfig | null {
  try {
    const home = resolve(process.env.SLASHCASH_HOME || join(homedir(), ".slashcash"));
    const configPath = join(home, "config.json");
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as {
      ai?: LocalAiConfig;
    };

    return raw.ai ?? null;
  } catch {
    return null;
  }
}
