import { createOpenAI } from "@ai-sdk/openai";
import { mistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";

const localOpenAICompatible = createOpenAI({
  apiKey: process.env.LOCAL_LLM_API_KEY ?? "local",
  baseURL: process.env.LOCAL_LLM_BASE_URL ?? "http://127.0.0.1:11434/v1",
});

export function defaultModel(): LanguageModel {
  return localOpenAICompatible(process.env.LOCAL_LLM_MODEL ?? "gemma4");
}

export function OCRModel(): LanguageModel {
  return mistral("mistral-large-latest");
}
