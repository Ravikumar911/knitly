import { Eval } from "braintrust";
import { openai } from "@ai-sdk/openai";
import { 
  extractWithOpenAI, 
  extractWithMistralOCR, 
  SlashAIV2Result 
} from "@workspace/tasks/agents/slashAIV2";
import { SwiggyMerchant } from "@workspace/tasks/merchants/swiggy/index";
import { EmailData } from "@workspace/tasks/types/slashAI";
import { config } from "dotenv";
import { getSupabaseSwiggyTestCases } from "./fixtures/supabase-swiggy-testcases";
import { type SwiggyExpectedOutput } from "./fixtures/swiggy-expected";
import { swiggyFieldScorer, schemaValidationScorer } from "./scorers/swiggy-field-scorer";
import { z } from "zod";
import { resolveEvalsPath } from "./utils/path";

// Load environment variables
config({ path: resolveEvalsPath(".env.local") });
config({ path: resolveEvalsPath(".env") });

/**
 * Get the AI model based on environment variable
 */
function getModel() {
  const modelName = process.env.MODEL_NAME || "gpt-5-nano";
  
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
 * Logger helper for tests
 */
const testLogger = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
} as any;

/**
 * Validate extraction data against Swiggy schema
 */
function validateExtractionData(data: unknown): {
  isValid: boolean;
  extractionResult: z.infer<typeof SwiggyMerchant.schema> | null;
  errors: string[];
} {
  try {
    const result = SwiggyMerchant.schema.parse(data);
    return { isValid: true, extractionResult: result, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        extractionResult: null,
        errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      };
    }
    return {
      isValid: false,
      extractionResult: null,
      errors: [error instanceof Error ? error.message : "Unknown validation error"],
    };
  }
}

/**
 * Convert raw extraction object to SlashAIV2Result format
 */
function toSlashAIV2Result(
  object: any,
  extractionMethod: string
): SlashAIV2Result {
  const { isValid, extractionResult, errors } = validateExtractionData(object);

  if (!isValid || !extractionResult) {
    return {
      extractionData: object as any,
      merchantId: SwiggyMerchant.id,
      merchantCode: SwiggyMerchant.code,
      extractionConfidence: 0,
      parseSuccess: false,
      parseErrors: errors,
    };
  }

  return {
    extractionData: extractionResult,
    merchantId: SwiggyMerchant.id,
    merchantCode: SwiggyMerchant.code,
    extractionConfidence: extractionResult.confidenceScore,
    parseSuccess: extractionResult.parseSuccess,
    parseErrors: extractionResult.parseErrors || [],
  };
}

type ExtractionMethodEvalCase = {
  input: {
    emailData: unknown;
    expected: SwiggyExpectedOutput;
    extractionMethod: "openai" | "mistral";
  };
  expected: SwiggyExpectedOutput;
  metadata: Record<string, unknown>;
};

/**
 * Load test cases and split by extraction method
 */
function loadTestCases(): ExtractionMethodEvalCase[] {
  const supabaseCases = getSupabaseSwiggyTestCases();
  
  return supabaseCases.map((testCase, index) => {
    const hasPdfAttachment = !!testCase.emailData.attachments?.some(
      (attachment) => attachment.mimeType === "application/pdf"
    );

    // PDFs should use Mistral OCR, text-only should use OpenAI
    const extractionMethod: "openai" | "mistral" = hasPdfAttachment ? "mistral" : "openai";

    return {
      input: {
        emailData: testCase.emailData as unknown,
        expected: testCase.expected,
        extractionMethod,
      },
      expected: testCase.expected,
      metadata: {
        testCaseIndex: index,
        parsedEmailId: testCase.parsedEmailId,
        storageUrl: testCase.storageUrl,
        pdfFilename: testCase.emailData.attachments?.[0]?.filename || `swiggy-case-${index}`,
        attachmentCount: testCase.emailData.attachments?.length ?? 0,
        hasPdfAttachment,
        extractionMethod,
      },
    };
  });
}

const TEST_CASES = loadTestCases();
const OPENAI_TEST_CASES = TEST_CASES.filter((tc) => tc.input.extractionMethod === "openai");
const MISTRAL_TEST_CASES = TEST_CASES.filter((tc) => tc.input.extractionMethod === "mistral");

console.log(`
==============================================
  Extraction Methods Evaluation
==============================================

Total Test Cases: ${TEST_CASES.length}
- OpenAI (text-only): ${OPENAI_TEST_CASES.length}
- Mistral OCR (PDF): ${MISTRAL_TEST_CASES.length}

This eval tests the individual extraction functions:
- extractWithOpenAI: For text-only emails
- extractWithMistralOCR: For emails with PDF attachments

==============================================
`);

/**
 * Eval: OpenAI Extraction Function
 * Tests extractWithOpenAI directly with text-only emails
 */
Eval("extraction-openai", {
  maxConcurrency: 1,
  
  data: () => OPENAI_TEST_CASES,

  task: async (input): Promise<SlashAIV2Result> => {
    const model = getModel();
    const emailData = input.emailData as EmailData;

    console.log(`[OpenAI Eval] Processing: ${emailData.subject}`);
    
    try {
      const object = await extractWithOpenAI(
        emailData,
        SwiggyMerchant.prompt,
        SwiggyMerchant.schema,
        model,
        testLogger
      );

      return toSlashAIV2Result(object, "openai");
    } catch (error) {
      console.error("[OpenAI Eval] Error in extraction:", error);
      
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
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
        extractionConfidence: 0,
        parseSuccess: false,
        parseErrors,
      };
    }
  },

  scores: [swiggyFieldScorer, schemaValidationScorer],

  experimentName: `openai-${process.env.MODEL_NAME || "gpt-5-nano"}`,

  metadata: {
    description: "Test extractWithOpenAI function with text-only emails",
    extractionMethod: "openai",
    modelOptions: ["gpt-5-nano", "gpt-5-mini", "gpt-4o", "gpt-4o-mini"],
    testCases: OPENAI_TEST_CASES.length,
    model: process.env.MODEL_NAME || "gpt-5-nano",
  },
});

/**
 * Eval: Mistral OCR Extraction Function
 * Tests extractWithMistralOCR directly with PDF emails
 */
Eval("extraction-mistral-ocr", {
  maxConcurrency: 1,
  
  data: () => MISTRAL_TEST_CASES,

  task: async (input): Promise<SlashAIV2Result> => {
    const emailData = input.emailData as EmailData;

    console.log(`[Mistral OCR Eval] Processing: ${emailData.subject}`);
    
    try {
      const object = await extractWithMistralOCR(
        emailData,
        SwiggyMerchant.prompt,
        SwiggyMerchant.schema,
        testLogger
      );

      return toSlashAIV2Result(object, "mistral");
    } catch (error) {
      console.error("[Mistral OCR Eval] Error in extraction:", error);
      
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
        merchantId: SwiggyMerchant.id,
        merchantCode: SwiggyMerchant.code,
        extractionConfidence: 0,
        parseSuccess: false,
        parseErrors,
      };
    }
  },

  scores: [swiggyFieldScorer, schemaValidationScorer],

  experimentName: "mistral-ocr-latest",

  metadata: {
    description: "Test extractWithMistralOCR function with PDF attachments",
    extractionMethod: "mistral-ocr",
    model: "mistral-ocr-latest",
    testCases: MISTRAL_TEST_CASES.length,
  },
});

console.log(`
==============================================
  Eval Configuration Complete
==============================================

To run this eval:

CLI Mode (terminal output):
  npx tsx src/extraction-methods.eval.ts

Braintrust UI (visual dashboard):
  npx braintrust eval src/extraction-methods.eval.ts

With different OpenAI models:
  MODEL_NAME=gpt-4o npx tsx src/extraction-methods.eval.ts
  MODEL_NAME=gpt-5-mini npx tsx src/extraction-methods.eval.ts

==============================================
`);

