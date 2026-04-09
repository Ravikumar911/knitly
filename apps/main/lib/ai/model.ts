import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const openaiCompatible = createOpenAI({
  apiKey: process.env.LOCAL_LLM_API_KEY ?? 'local',
  baseURL: process.env.LOCAL_LLM_BASE_URL ?? 'http://127.0.0.1:11434/v1',
});

export function assistantModel(): LanguageModel {
  if (process.env.LOCAL_LLM_PROVIDER === 'openai') {
    return openaiCompatible(process.env.OPENAI_MODEL ?? 'gpt-5-nano');
  }

  return openaiCompatible(process.env.LOCAL_LLM_MODEL ?? 'gemma4');
}
