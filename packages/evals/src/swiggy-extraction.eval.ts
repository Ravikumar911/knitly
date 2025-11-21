import { Eval } from "braintrust";
import { openai } from "@ai-sdk/openai";
import { extractEmailData, SlashAIV2Result } from "@workspace/tasks/agents/slashAIV2";
import { EmailData } from "@workspace/tasks/types/slashAI";
import { config } from "dotenv";
import { getSupabaseSwiggyTestCases } from "./fixtures/supabase-swiggy-testcases";
import { type SwiggyExpectedOutput } from "./fixtures/swiggy-expected";
import { swiggyFieldScorer, schemaValidationScorer } from "./scorers/swiggy-field-scorer";
import { resolveEvalsPath } from "./utils/path";

// Load environment variables
config({ path: resolveEvalsPath(".env.local") });
config({ path: resolveEvalsPath(".env") });

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

type SwiggyEvalCase = {
  input: {
    emailData: unknown;
    expected: SwiggyExpectedOutput;
  };
  expected: SwiggyExpectedOutput;
  metadata: Record<string, unknown>;
};

function loadTestCases(): SwiggyEvalCase[] {
  const supabaseCases = getSupabaseSwiggyTestCases();
  return supabaseCases.map((testCase, index) => {
    const hasPdfAttachment = !!testCase.emailData.attachments?.some(
      (attachment) => attachment.mimeType === "application/pdf"
    );

    return {
      input: {
        emailData: testCase.emailData as unknown,
        expected: testCase.expected,
      },
      expected: testCase.expected,
      metadata: {
        testCaseIndex: index,
        parsedEmailId: testCase.parsedEmailId,
        storageUrl: testCase.storageUrl,
        pdfFilename: testCase.emailData.attachments?.[0]?.filename || `swiggy-case-${index}`,
        attachmentCount: testCase.emailData.attachments?.length ?? 0,
        hasPdfAttachment,
        modelPath: hasPdfAttachment ? "ocr" : "text-only",
      },
    };
  });
}

const TEST_CASES = loadTestCases();
const TOTAL_TEST_CASES = TEST_CASES.length;

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
  data: () => TEST_CASES,

  // Task: Extract data using slashAIV2Agent with specified model
  task: async (input): Promise<SlashAIV2Result> => {
    const model = getModel();
    const emailData = input.emailData as EmailData;
    const hasPdfAttachment =
      !!emailData.attachments?.some((attachment) => attachment.mimeType === "application/pdf");

    console.log(
      "[Swiggy Eval] Model strategy",
      hasPdfAttachment ? "ocr (PDF attachments detected)" : "text-only (no PDFs)"
    );
    
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
      const parseErrors = [error instanceof Error ? error.message : "Unknown error"];

      return {
        extractionData: {
          detectedProvider: "Unknown",
          emailType: "OTHER",
          emailSubject: emailData.subject || "",
          parseSuccess: false,
          parseErrors,
          confidenceScore: 0,
        },
        merchantId: "swiggy",
        merchantCode: "SWIGGY",
        extractionConfidence: 0,
        parseSuccess: false,
        parseErrors,
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
    dataSource: "swiggy-testcases",
    totalCases: TOTAL_TEST_CASES,
  },
});

console.log(`
==============================================
  Swiggy Extraction Evaluation Started
==============================================

Model: ${process.env.MODEL_NAME || "gpt-5-nano (default)"}
Data Source: swiggy-testcases
Test Cases: ${TOTAL_TEST_CASES}

To run this eval:

CLI Mode (terminal output):
  npx tsx src/swiggy-extraction.eval.ts

Braintrust UI (visual dashboard):
  npx braintrust eval src/swiggy-extraction.eval.ts

With different models:
  MODEL_NAME=gpt-4o npx tsx src/swiggy-extraction.eval.ts
  MODEL_NAME=gpt-5-mini npx tsx src/swiggy-extraction.eval.ts

==============================================
`);

