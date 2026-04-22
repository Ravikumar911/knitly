import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
export const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "gemma3n:e4b";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: OLLAMA_BASE_URL,
});

export function chatModel(): LanguageModel {
  return ollama(OLLAMA_CHAT_MODEL);
}
