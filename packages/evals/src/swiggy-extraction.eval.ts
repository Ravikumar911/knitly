import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { SlashAIV2Result } from "@workspace/tasks/extract/extract-from-email-body";
import { extractTransactionFromEmail } from "@workspace/tasks/extract/pipeline";
import { DEFAULT_OLLAMA_CHAT_MODEL } from "@workspace/tasks/ai/model";
import { EmailData } from "@workspace/tasks/types/slashAI";
import { getAllTestCases } from "./fixtures/swiggy-samples";
import { SWIGGY_EXPECTED_OUTPUTS } from "./fixtures/swiggy-expected";
import {
  swiggyFieldScorer,
  schemaValidationScorer,
} from "./scorers/swiggy-field-scorer";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

type EvalCase = {
  input: {
    emailData: unknown;
    expected: (typeof SWIGGY_EXPECTED_OUTPUTS)[number];
  };
  expected: (typeof SWIGGY_EXPECTED_OUTPUTS)[number];
  metadata: Record<string, unknown>;
};

type EvalScore = Awaited<ReturnType<typeof swiggyFieldScorer>>;

/**
 * Swiggy Data Extraction Evaluation
 *
 * Tests the body-only Swiggy extraction accuracy with the configured local model
 * Compares field-level extraction against expected outputs
 */
function loadData(): EvalCase[] {
  const testCases = getAllTestCases();
  const expectedOutputs = SWIGGY_EXPECTED_OUTPUTS.slice(-testCases.length);

  return testCases.map((emailData, index) => {
    const expected = expectedOutputs[index];
    if (!expected) {
      throw new Error(`Missing expected output for test case ${index}`);
    }

    return {
      input: {
        emailData: emailData as unknown,
        expected,
      },
      expected,
      metadata: {
        testCaseIndex: index,
        pdfFilename: emailData.attachments?.[0]?.filename || `test-${index}`,
      },
    };
  });
}

async function runExtraction(
  input: EvalCase["input"],
): Promise<SlashAIV2Result> {
  const emailData = input.emailData as EmailData;
  process.env.SLASHCASH_SYNC_SKIP_AI = "1";

  const result = await extractTransactionFromEmail(emailData, {
    storeTransaction: false,
  });

  return {
    extractionData: result.extractionData,
    merchantId: "swiggy",
    merchantCode: "SWIGGY",
    schemaUsed: result.schemaUsed,
    extractionConfidence: result.extractionConfidence,
    parseSuccess: result.parseSuccess,
    parseErrors: result.parseErrors,
    transactionId: result.transactionId,
  };
}

async function main() {
  const modelName = process.env.OLLAMA_CHAT_MODEL || DEFAULT_OLLAMA_CHAT_MODEL;
  const testCases = loadData();

  console.log(`
==============================================
  Swiggy Extraction Evaluation Started
==============================================

Model: ${modelName}
Test Cases: ${testCases.length} Swiggy PDF invoices

==============================================
`);

  const rows: Array<{
    file: string;
    fieldScore: EvalScore;
    schemaScore: EvalScore;
  }> = [];

  for (const testCase of testCases) {
    const output = await runExtraction(testCase.input);
    const fieldScore = await swiggyFieldScorer({
      input: testCase.input,
      output,
    });
    const schemaScore = await schemaValidationScorer({
      input: testCase.input,
      output,
    });

    rows.push({
      file: String(testCase.metadata.pdfFilename),
      fieldScore,
      schemaScore,
    });

    console.log(
      `${testCase.metadata.pdfFilename}: field ${fieldScore.score.toFixed(2)}, schema ${schemaScore.score.toFixed(2)}`,
    );
  }

  const fieldAverage =
    rows.reduce((sum, row) => sum + row.fieldScore.score, 0) / rows.length;
  const schemaAverage =
    rows.reduce((sum, row) => sum + row.schemaScore.score, 0) / rows.length;

  console.log(`
==============================================
  Swiggy Extraction Evaluation Complete
==============================================

Field accuracy: ${fieldAverage.toFixed(2)}
Schema validity: ${schemaAverage.toFixed(2)}

==============================================
`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
