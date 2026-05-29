/**
 * Assistant Evaluation Runner
 *
 * This is the main script for regression testing the slash.cash assistant.
 *
 * Usage:
 *   pnpm --filter @knitly/main exec tsx lib/ai/evals/run-assistant-eval.ts
 *
 * It runs the current agent configuration against the golden dataset and
 * produces snapshots + basic scoring. This catches regressions when you
 * change prompts, tools, or models.
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateText, stepCountIs } from "ai";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { goldenDataset } from "./golden-dataset";
import { buildAssistantSystemPrompt } from "../assistant-instructions";
import { financeTools } from "../tools/finance";
import { scoreAssistantResponse } from "./scoring";

// Robustly load .env.local from the apps/main directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocalPath = join(__dirname, "../../../../.env.local");

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  // Fallback to default dotenv behavior (looks for .env in cwd)
  dotenv.config();
}

const RESULTS_DIR = join(__dirname, "results");

interface EvalResult {
  id: string;
  query: string;
  steps: any[];
  finalText: string;
  toolCalls: string[];
  timestamp: string;
}

async function runEval() {
  console.log("🚀 Running slash.cash Assistant Evaluation...\n");

  // Use generateText (same tool loop + stopWhen semantics as the primary
  // production streaming route). This makes evals representative of real UI behavior.
  const model = await import("../provider").then((m) => m.chatModel());
  const results: EvalResult[] = [];

  for (const testCase of goldenDataset) {
    console.log(`Running: ${testCase.id} — "${testCase.query}"`);

    try {
      const result = await generateText({
        model,
        system: buildAssistantSystemPrompt(),
        prompt: testCase.query,
        tools: financeTools,
        temperature: 0,
        stopWhen: stepCountIs(8),
      });

      const toolCalls = result.steps
        .flatMap((step: any) => step.toolCalls ?? [])
        .map((tc: any) => tc.toolName);

      const evalResult: EvalResult = {
        id: testCase.id,
        query: testCase.query,
        steps: result.steps,
        finalText: result.text,
        toolCalls,
        timestamp: new Date().toISOString(),
      };

      results.push(evalResult);

      console.log(`  → Tools used: [${toolCalls.join(", ")}]`);
      console.log(`  → Output length: ${result.text.length} chars`);

      // Optional LLM-as-Judge scoring (best effort)
      try {
        const scores = await scoreAssistantResponse(
          testCase.query,
          result.text,
          toolCalls,
        );
        console.log(
          `  → Scores: groundedness=${scores.groundedness}, helpfulness=${scores.helpfulness}, overall=${scores.overall}`,
        );
        (evalResult as any).scores = scores;
      } catch {
        console.log(`  → Scoring skipped (no model or error)`);
      }

      console.log("");
    } catch (error) {
      console.error(`  ❌ Failed: ${testCase.id}`, error);
    }
  }

  // Save full results for inspection
  const runId = Date.now();
  mkdirSync(RESULTS_DIR, { recursive: true });
  const resultsPath = join(RESULTS_DIR, `run-${runId}.json`);
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Evaluation complete. Full results saved to:`);
  console.log(`   ${resultsPath}`);
  console.log(
    `\nTip: Use Vitest snapshots on the 'steps' for strong regression protection.`,
  );
}

runEval().catch(console.error);
