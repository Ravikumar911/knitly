import { z } from "zod";

// Base transaction schema that all merchants extend
export const BaseTransactionSchema = z.object({
  // Basic transaction data
  amount: z
    .number()
    .positive("Amount must be positive")
    .describe("Transaction amount as a positive number"),
  currency: z
    .string()
    .default("INR")
    .describe("Currency code, defaults to INR"),
  type: z
    .enum(["DEBIT", "CREDIT"])
    .describe(
      "Transaction type - DEBIT for money spent, CREDIT for money received",
    ),
  status: z
    .enum(["COMPLETED", "PENDING", "FAILED", "CANCELLED"])
    .default("COMPLETED")
    .describe("Current status of the transaction"),

  // Date information
  transactionDate: z
    .string()
    .optional()
    .describe("Transaction date and time in ISO 8601 format"),

  // Description and categorization
  description: z
    .string()
    .min(1, "Description is required")
    .describe("Human-readable description of the transaction"),
  category: z
    .string()
    .optional()
    .describe("Category of the transaction (e.g., FOOD_DELIVERY, GROCERIES)"),

  // Merchant information (basic)
  merchantName: z
    .string()
    .optional()
    .describe("Name of the merchant or business"),
  merchantCategory: z
    .string()
    .optional()
    .describe("Category of the merchant business"),

  // Payment method
  paymentMethod: z
    .string()
    .optional()
    .describe("Payment method used for the transaction"),

  // Reference IDs
  referenceIds: z
    .record(z.string())
    .default({})
    .describe("Key-value pairs of various transaction reference IDs"),

  // Location (if available)
  location: z
    .object({
      address: z.string().optional().describe("Street address"),
      city: z.string().optional().describe("City name"),
      state: z.string().optional().describe("State or province"),
      country: z.string().optional().describe("Country name"),
      coordinates: z
        .object({
          lat: z.number().describe("Latitude coordinate"),
          lng: z.number().describe("Longitude coordinate"),
        })
        .optional()
        .describe("GPS coordinates"),
    })
    .optional()
    .describe("Location information for the transaction"),
});

// Extended schema with metadata and parsing info
export const BaseExtractionSchema = z.object({
  // Source metadata
  detectedProvider: z
    .string()
    .describe(
      "Name of the detected financial service provider (e.g., 'Swiggy', 'PhonePe')",
    ),
  emailType: z
    .enum([
      "TRANSACTION_ALERT",
      "ORDER_CONFIRMATION",
      "PAYMENT_CONFIRMATION",
      "STATEMENT",
      "BALANCE_UPDATE",
      "OTHER",
    ])
    .describe("Type of email that was processed"),
  emailSubject: z.string().describe("Original subject line of the email"),

  // Analysis results
  parseSuccess: z
    .boolean()
    .describe("Whether the email was successfully parsed for financial data"),
  parseErrors: z
    .array(z.string())
    .default([])
    .describe("List of any errors encountered during parsing"),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score from 0 to 1 for the extracted data quality"),

  // Data source
  dataSource: z
    .enum(["EMAIL_BODY", "PDF_ATTACHMENT", "BOTH"])
    .optional()
    .describe("Source from which the financial data was extracted"),

  // Transaction data (optional - may not be present for non-transaction emails)
  transaction: BaseTransactionSchema.optional().describe(
    "Detailed transaction information, if a transaction was detected",
  ),

  // Merchant identification
  merchantId: z
    .string()
    .optional()
    .describe("Internal identifier for the merchant"),
  merchantCode: z.string().optional().describe("Short code for the merchant"),
});

// Type exports for TypeScript usage
export type BaseTransaction = z.infer<typeof BaseTransactionSchema>;
export type BaseExtraction = z.infer<typeof BaseExtractionSchema>;
