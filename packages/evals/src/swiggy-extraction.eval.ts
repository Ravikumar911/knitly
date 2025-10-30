import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Eval } from "braintrust";
import { openai } from "@ai-sdk/openai";
import { extractEmailData, SlashAIV2Result } from "@workspace/tasks/agents/slashAIV2";
import { EmailData } from "@workspace/tasks/types/slashAI";
import { getAllTestCases } from "./fixtures/swiggy-samples";
import { SWIGGY_EXPECTED_OUTPUTS } from "./fixtures/swiggy-expected";
import { swiggyFieldScorer, schemaValidationScorer } from "./scorers/swiggy-field-scorer";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

/**
 * Get the AI model based on environment variable or experiment name
 */
function getModel(experimentName?: string) {
  const modelName = process.env.MODEL_NAME || experimentName || "gpt-5-nano";
  
  console.log(`Using model: ${modelName}`);
  
  // Map model names to OpenAI SDK models
  switch (modelName) {
    case "gpt-5-nano":
      return openai("gpt-5-nano");
    case "gpt-5-mini":
      return openai("gpt-5-mini");
    case "gpt-4o":
      return openai("gpt-4o");
    case "gpt-4o-mini":
      return openai("gpt-4o-mini");
    default:
      console.warn(`Unknown model: ${modelName}, defaulting to gpt-5-nano`);
      return openai("gpt-5-nano");
  }
}

/**
 * Swiggy Data Extraction Evaluation
 * 
 * Tests the slashAIV2Agent extraction accuracy with different AI models
 * Compares field-level extraction against expected outputs
 */
Eval("swiggy-extraction", {
  // Process one PDF at a time to avoid rate limiting and token exhaustion
  maxConcurrency: 1,
  
  // Load test data: 10 Swiggy PDF invoices with expected outputs
  data: () => {
    const testCases = getAllTestCases();
    
    return testCases.map((emailData, index) => {
      const expected = SWIGGY_EXPECTED_OUTPUTS[index];
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
  },

  // Task: Extract data using slashAIV2Agent with specified model
  task: async (input): Promise<SlashAIV2Result> => {
    const model = getModel();
    const emailData = input.emailData as EmailData;
    
    try {
      // Call extraction function with test model
      const result = await extractEmailData(
        emailData,
        model,
        { 
          // Use console logger for tests to avoid Trigger.dev dependency
          // Type cast to any to avoid Trigger.dev LoggerAPI type mismatch
          logger: {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug,
          } as any
        }
      );
      
      return result;
    } catch (error) {
      console.error("Error in extraction task:", error);
      
      // Return error result with properly typed extractionData
      return {
        extractionData: {
          detectedProvider: 'Unknown',
          emailType: 'OTHER' as const,
          emailSubject: emailData.subject || '',
          parseSuccess: false,
          parseErrors: [error instanceof Error ? error.message : 'Unknown error'],
          confidenceScore: 0,
        },
        extractionConfidence: 0,
        schemaUsed: 'base' as const,
        parseSuccess: false,
        parseErrors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  },

  // Scoring functions
  scores: [swiggyFieldScorer, schemaValidationScorer],

  // Optional: Set experiment name from environment
  experimentName: process.env.MODEL_NAME,

  // Optional: Metadata about the evaluation
  metadata: {
    description: "Swiggy invoice extraction accuracy evaluation",
    modelOptions: ["gpt-5-nano", "gpt-5-mini", "gpt-4o", "gpt-4o-mini"],
    criticalFields: ["orderId", "amount", "restaurantName"],
  },
});

console.log(`
==============================================
  Swiggy Extraction Evaluation Started
==============================================

Model: ${process.env.MODEL_NAME || "gpt-5-nano (default)"}
Test Cases: 10 Swiggy PDF invoices

To run with different models:
- MODEL_NAME=gpt-5-nano pnpm eval:swiggy
- MODEL_NAME=gpt-5-mini pnpm eval:swiggy

Or use the npm scripts:
- pnpm eval:swiggy:nano
- pnpm eval:swiggy:mini

View results in Braintrust UI:
- pnpm eval:swiggy:ui

==============================================
`);

