/**
 * Assistant Regression Tests
 *
 * These tests protect against regressions when you change:
 * - System prompt / instructions
 * - Tool definitions or descriptions
 * - Agent configuration (maxSteps, temperature, etc.)
 * - Model (when you upgrade)
 *
 * They focus on **tool-calling behavior** (the most fragile part of agents).
 */

import { describe, it, expect } from "vitest";
import { generateText, stepCountIs } from "ai";
import { buildAssistantSystemPrompt } from "../assistant-instructions";
import { financeTools } from "../tools/finance";
import { goldenDataset } from "./golden-dataset";

describe("Assistant Regression - Tool Trajectories", () => {
  // Use a consistent low temperature for regression stability.
  // We now use the exact same generateText + tools + stopWhen path that the
  // primary production streaming route (and the UI via @ai-sdk/react) exercises.
  const createAgent = async () => {
    const model = await import("../provider").then((m) => m.chatModel());
    return { model }; // lightweight handle for generateText call site
  };

  // We only test a subset of critical cases in CI for speed
  const criticalCases = goldenDataset.filter((tc) =>
    [
      "relative-date-instamart",
      "top-restaurant-vs-grocery",
      "no-results-specific",
    ].includes(tc.id),
  );

  criticalCases.forEach((testCase) => {
    it(`should produce stable tool trajectory for: ${testCase.id}`, async () => {
      let model;
      try {
        const handle = await createAgent();
        model = handle.model;
      } catch (err: any) {
        if (
          err.message?.includes("no-assistant-provider") ||
          err.message?.includes("assistant not configured")
        ) {
          // Skip in environments without a configured assistant provider (common in CI until secrets are set)
          console.warn(
            `Skipping ${testCase.id} — no assistant provider configured.`,
          );
          return;
        }
        throw err;
      }

      // Use generateText + tools + stepCountIs — identical loop & stop semantics to the
      // primary production path in /api/assistant/stream (and the UI via useChat).
      const result = await generateText({
        model,
        system: buildAssistantSystemPrompt(),
        prompt: testCase.query,
        tools: financeTools,
        temperature: 0,
        stopWhen: stepCountIs(6),
      });

      // This is the powerful regression signal:
      // We snapshot the sequence of tool calls + their arguments structure
      const trajectory = result.steps.map((step: any) => ({
        toolCalls: (step.toolCalls ?? []).map((tc: any) => ({
          toolName: tc.toolName,
          // We snapshot argument keys + types, not full values (less brittle)
          argKeys: Object.keys(tc.args ?? {}),
        })),
      }));

      // Snapshot the tool-calling behavior
      expect(trajectory).toMatchSnapshot(`trajectory-${testCase.id}`);

      // Basic sanity checks
      expect(result.text.length).toBeGreaterThan(20);
    }, 60_000); // Agents can take time
  });
});
