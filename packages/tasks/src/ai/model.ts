import { openai } from "@ai-sdk/openai";
import { mistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";

export function defaultModel(): LanguageModel {
	return openai("gpt-5-nano");
}

export function mistralOCRModel(): LanguageModel {
	return mistral("mistral-medium-latest");
}

