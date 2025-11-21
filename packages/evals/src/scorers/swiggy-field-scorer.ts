import { Levenshtein } from "autoevals";
import { SwiggyExpectedOutput } from "../fixtures/swiggy-expected";
import type { SlashAIV2Result } from "@workspace/tasks/agents/slashAIV2";

// Braintrust Scorer type
type Scorer<Input, Output> = (args: {
  input: Input;
  output: Output;
}) => Promise<{
  name: string;
  score: number;
  metadata?: Record<string, unknown>;
}>;

/**
 * Field-level scoring metadata
 */
interface FieldScore {
  field: string;
  score: number;
  expected: unknown;
  actual: unknown;
  message?: string;
}

/**
 * Custom scorer for Swiggy field extraction accuracy
 * Compares actual extraction results against expected outputs
 */
export const swiggyFieldScorer: Scorer<
  { emailData: unknown; expected: SwiggyExpectedOutput },
  SlashAIV2Result
> = async ({ input, output }) => {
  const expected = input.expected;
  const actual = output?.extractionData;

  if (!actual) {
    return {
      name: "swiggy_field_accuracy",
      score: 0,
      metadata: {
        error: "No extraction data in output",
      },
    };
  }

  const fieldScores: FieldScore[] = [];
  let totalScore = 0;
  let totalFields = 0;

  // Helper to add field score
  const addFieldScore = (
    field: string,
    score: number,
    expected: unknown,
    actual: unknown,
    message?: string
  ) => {
    fieldScores.push({ field, score, expected, actual, message });
    totalScore += score;
    totalFields++;
  };

  // 1. Parse Success (Critical)
  addFieldScore(
    "parseSuccess",
    actual.parseSuccess === expected.parseSuccess ? 1 : 0,
    expected.parseSuccess,
    actual.parseSuccess
  );

  // 2. Order ID (Critical - Exact Match)
  if (expected.transaction?.orderId) {
    const orderIdMatch =
      actual.transaction?.orderId === expected.transaction.orderId;
    addFieldScore(
      "transaction.orderId",
      orderIdMatch ? 1 : 0,
      expected.transaction.orderId,
      actual.transaction?.orderId,
      orderIdMatch ? "Exact match" : "Mismatch"
    );
  }

  // 3. Amount (Critical - With tolerance)
  if (expected.transaction?.amount !== undefined) {
    const expectedAmount = expected.transaction.amount;
    const actualAmount = actual.transaction?.amount || 0;
    const amountDiff = Math.abs(expectedAmount - actualAmount);
    const amountScore = amountDiff <= 0.01 ? 1 : amountDiff <= 1 ? 0.5 : 0;
    addFieldScore(
      "transaction.amount",
      amountScore,
      expectedAmount,
      actualAmount,
      `Difference: ${amountDiff.toFixed(2)}`
    );
  }

  // 4. Restaurant Name (Fuzzy Match using Levenshtein)
  if (expected.transaction?.restaurantName) {
    const expectedName = expected.transaction.restaurantName;
    const actualName = actual.transaction?.restaurantName || "";
    
    if (expectedName && actualName) {
      const levenshteinResult = await Levenshtein({
        output: actualName,
        expected: expectedName,
      });
      const restaurantScore = levenshteinResult.score || 0;
      addFieldScore(
        "transaction.restaurantName",
        restaurantScore,
        expectedName,
        actualName,
        `Similarity: ${(restaurantScore * 100).toFixed(0)}%`
      );
    } else {
      addFieldScore(
        "transaction.restaurantName",
        actualName ? 0.5 : 0,
        expectedName,
        actualName,
        actualName ? "Name extracted but no expected value" : "Missing"
      );
    }
  }

  // 5. Order Items Count
  if (expected.transaction?.orderItems) {
    const expectedCount = expected.transaction.orderItems.length;
    const actualCount = actual.transaction?.orderItems?.length || 0;
    const countScore = expectedCount === actualCount ? 1 : Math.max(0, 1 - Math.abs(expectedCount - actualCount) * 0.2);
    addFieldScore(
      "transaction.orderItems.count",
      countScore,
      expectedCount,
      actualCount,
      `Expected ${expectedCount}, got ${actualCount}`
    );
  }

  // 6. Order Items Accuracy (if items exist)
  if (
    expected.transaction?.orderItems &&
    expected.transaction.orderItems.length > 0 &&
    actual.transaction?.orderItems &&
    actual.transaction.orderItems.length > 0
  ) {
    let itemMatches = 0;
    const expectedItems = expected.transaction.orderItems;
    const actualItems = actual.transaction.orderItems;

    for (const expectedItem of expectedItems) {
      const match = actualItems.find(
        (item: { name?: string }) =>
          item.name &&
          expectedItem.name &&
          item.name.toLowerCase().includes(expectedItem.name.toLowerCase())
      );
      if (match) itemMatches++;
    }

    const itemAccuracy = expectedItems.length > 0 ? itemMatches / expectedItems.length : 0;
    addFieldScore(
      "transaction.orderItems.accuracy",
      itemAccuracy,
      expectedItems.length,
      itemMatches,
      `${itemMatches}/${expectedItems.length} items matched`
    );
  }

  // 7. Delivery Address (Presence check)
  if (expected.transaction?.deliveryAddress) {
    const hasAddress = !!actual.transaction?.deliveryAddress?.fullAddress;
    addFieldScore(
      "transaction.deliveryAddress",
      hasAddress ? 1 : 0,
      "Present",
      hasAddress ? "Present" : "Missing"
    );
  }

  // 8. Currency
  if (expected.transaction?.currency) {
    const currencyMatch = actual.transaction?.currency === expected.transaction.currency;
    addFieldScore(
      "transaction.currency",
      currencyMatch ? 1 : 0,
      expected.transaction.currency,
      actual.transaction?.currency
    );
  }

  // 9. Transaction Type
  if (expected.transaction?.type) {
    const typeMatch = actual.transaction?.type === expected.transaction.type;
    addFieldScore(
      "transaction.type",
      typeMatch ? 1 : 0,
      expected.transaction.type,
      actual.transaction?.type
    );
  }

  // 10. Swiggy Service Type
  if (expected.swiggyMetadata?.service) {
    const serviceMatch = actual.swiggyMetadata?.service === expected.swiggyMetadata.service;
    addFieldScore(
      "swiggyMetadata.service",
      serviceMatch ? 1 : 0,
      expected.swiggyMetadata.service,
      actual.swiggyMetadata?.service
    );
  }

  // 11. Order Type (DELIVERY/PICKUP)
  if (expected.swiggyMetadata?.orderType) {
    const orderTypeMatch = actual.swiggyMetadata?.orderType === expected.swiggyMetadata.orderType;
    addFieldScore(
      "swiggyMetadata.orderType",
      orderTypeMatch ? 1 : 0,
      expected.swiggyMetadata.orderType,
      actual.swiggyMetadata?.orderType
    );
  }

  // 12. Confidence Score (should be reasonable)
  const confidenceScore = actual.confidenceScore || 0;
  const confidenceOk = confidenceScore >= 0.5 ? 1 : confidenceScore >= 0.3 ? 0.5 : 0;
  addFieldScore(
    "confidenceScore",
    confidenceOk,
    ">= 0.5",
    confidenceScore,
    `Confidence: ${(confidenceScore * 100).toFixed(0)}%`
  );

  // Calculate overall score
  const overallScore = totalFields > 0 ? totalScore / totalFields : 0;

  // Group scores by category for better visualization
  const criticalFields = fieldScores.filter(f => 
    f.field.includes("orderId") || 
    f.field.includes("amount") || 
    f.field === "parseSuccess"
  );
  const merchantFields = fieldScores.filter(f => 
    f.field.includes("restaurant") || 
    f.field.includes("swiggyMetadata")
  );
  const itemFields = fieldScores.filter(f => f.field.includes("orderItems"));

  return {
    name: "swiggy_field_accuracy",
    score: overallScore,
    metadata: {
      totalScore,
      totalFields,
      criticalFieldsScore: criticalFields.reduce((sum, f) => sum + f.score, 0) / Math.max(criticalFields.length, 1),
      merchantFieldsScore: merchantFields.reduce((sum, f) => sum + f.score, 0) / Math.max(merchantFields.length, 1),
      itemFieldsScore: itemFields.reduce((sum, f) => sum + f.score, 0) / Math.max(itemFields.length, 1),
      fieldScores,
      criticalFields: criticalFields.map(f => ({
        field: f.field,
        score: f.score,
        message: f.message,
      })),
      failedFields: fieldScores.filter(f => f.score < 0.5),
    },
  };
};

/**
 * Schema validation scorer
 * Checks if the extraction result conforms to SwiggyExtractionSchema
 */
export const schemaValidationScorer: Scorer<
  { emailData: unknown; expected: SwiggyExpectedOutput },
  SlashAIV2Result
> = async ({ output }) => {
  if (!output) {
    return {
      name: "schema_validation",
      score: 0,
      metadata: { error: "No output" },
    };
  }

  const provider = output.extractionData?.detectedProvider;
  const validations = {
    hasExtractionData: !!output.extractionData,
    hasParseSuccess: typeof output.parseSuccess === "boolean",
    hasConfidenceScore: typeof output.extractionConfidence === "number",
    merchantIdMatches: output.merchantId === "swiggy",
    merchantCodeMatches: output.merchantCode === "SWIGGY",
    providerMatches: provider ? provider.toLowerCase() === "swiggy" : false,
  };

  const passed = Object.values(validations).filter(Boolean).length;
  const total = Object.keys(validations).length;
  const score = total === 0 ? 0 : passed / total;

  return {
    name: "schema_validation",
    score,
    metadata: {
      validations,
      passed,
      total,
      merchantId: output.merchantId,
      merchantCode: output.merchantCode,
      detectedProvider: provider,
    },
  };
};

