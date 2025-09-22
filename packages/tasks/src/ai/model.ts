import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function defaultModel(): LanguageModel {
	return openai("gpt-5-nano");
}

