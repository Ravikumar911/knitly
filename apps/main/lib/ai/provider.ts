import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_OLLAMA_CHAT_MODEL = "gemma3n:e4b";

export function chatModel(): LanguageModel {
  return createOpenAICompatible({
    name: "ollama",
    baseURL: process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
  })(process.env.OLLAMA_CHAT_MODEL || DEFAULT_OLLAMA_CHAT_MODEL);
}
