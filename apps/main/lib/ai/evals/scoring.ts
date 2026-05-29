/**
 * Simple LLM-as-Judge scoring for assistant responses.
 * Used in the evaluation runner for quality signals.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { chatModel } from "../provider";

const ScoreSchema = z.object({
  groundedness: z
    .number()
    .min(1)
    .max(5)
    .describe(
      "How well the answer is grounded in actual tool data (1=hallucinated, 5=perfectly grounded)",
    ),
  helpfulness: z
    .number()
    .min(1)
    .max(5)
    .describe(
      "How helpful and actionable the response is for a personal finance user",
    ),
  clarity: z
    .number()
    .min(1)
    .max(5)
    .describe("How clear and easy to understand the response is"),
  tone: z
    .number()
    .min(1)
    .max(5)
    .describe("How friendly, non-judgmental, and appropriate the tone is"),
  overall: z.number().min(1).max(5),
});

export type AssistantScore = z.infer<typeof ScoreSchema>;

export async function scoreAssistantResponse(
  query: string,
  response: string,
  toolCallsUsed: string[],
): Promise<AssistantScore> {
  const model = await chatModel();

  const { object } = await generateObject({
    model,
    schema: ScoreSchema,
    prompt: `You are evaluating a personal finance assistant for a Swiggy spending tracker app.

User query: "${query}"

Assistant response:
"""
${response}
"""

Tools the assistant used in this interaction: ${toolCallsUsed.join(", ") || "none"}

Score the response on the following dimensions from 1-5:

- groundedness: Does the answer stick to real data from tools, or does it hallucinate/make things up?
- helpfulness: Is this useful for someone trying to understand and manage their spending?
- clarity: Is the language clear and easy to follow?
- tone: Is the tone friendly, direct, and non-judgmental (important for personal finance)?

Return only the scores.`,
  });

  return object;
}
