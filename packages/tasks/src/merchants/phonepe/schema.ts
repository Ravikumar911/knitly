import { z } from "zod";
import {
  BaseTransactionSchema,
  BaseExtractionSchema,
} from "../base/baseSchema";

// PhonePe-specific transaction extensions
export const PhonePeTransactionSchema = BaseTransactionSchema.extend({
  // UPI transaction details
  upiId: z.string().optional().describe("UPI ID used for the transaction"),
  upiTransactionId: z
    .string()
    .optional()
    .describe("UPI system generated transaction ID"),

  // PhonePe transaction ID (different from UPI)
  phonePeTransactionId: z
    .string()
    .optional()
    .describe("PhonePe's internal transaction reference ID"),

  // Bank details
  bankAccount: z
    .object({
      accountNumber: z
        .string()
        .optional()
        .describe("Masked bank account number"),
      ifscCode: z.string().optional().describe("IFSC code of the bank"),
      bankName: z.string().optional().describe("Name of the bank"),
    })
    .optional()
    .describe("Bank account details involved in the transaction"),

  // Merchant transaction details
  merchantTransactionId: z
    .string()
    .optional()
    .describe("Merchant's internal transaction reference"),
  merchantUpiId: z.string().optional().describe("Merchant's UPI ID"),

  // Transaction context
  transactionNote: z
    .string()
    .optional()
    .describe("Note or description provided with the transaction"),
  payeeVpa: z
    .string()
    .optional()
    .describe("Virtual Payment Address of the recipient"),
  payerVpa: z
    .string()
    .optional()
    .describe("Virtual Payment Address of the sender"),

  // PhonePe specific fees and charges
  convenienceFee: z
    .number()
    .optional()
    .describe("Convenience fee charged by PhonePe"),
  cashback: z
    .number()
    .optional()
    .describe("Cashback amount earned from the transaction"),

  // Rewards and offers
  rewardPoints: z
    .number()
    .optional()
    .describe("Reward points earned from the transaction"),
  offerApplied: z
    .string()
    .optional()
    .describe("Description of any offer or discount applied"),

  // Transaction mode
  mode: z
    .enum(["UPI", "WALLET", "CARD", "BANK_TRANSFER"])
    .optional()
    .describe("Payment mode used for the transaction"),
});

// Complete PhonePe extraction schema
export const PhonePeExtractionSchema = BaseExtractionSchema.extend({
  // Override transaction field with PhonePe-specific schema
  transaction: PhonePeTransactionSchema.optional().describe(
    "Detailed PhonePe transaction information",
  ),

  // PhonePe-specific metadata
  phonePeMetadata: z
    .object({
      appVersion: z
        .string()
        .optional()
        .describe("Version of the PhonePe app used"),
      deviceId: z
        .string()
        .optional()
        .describe("Device identifier (usually masked)"),
      transactionType: z
        .enum([
          "P2P", // Person to Person
          "P2M", // Person to Merchant
          "BILL_PAYMENT",
          "RECHARGE",
          "WALLET_LOAD",
          "WITHDRAWAL",
        ])
        .optional()
        .describe(
          "Type of PhonePe transaction - P2P for person to person, P2M for merchant payments",
        ),
      isSuccessful: z
        .boolean()
        .default(true)
        .describe("Whether the transaction was successful"),
    })
    .optional()
    .describe(
      "PhonePe-specific metadata that should be at the root level, not inside transaction",
    ),
});

// Type exports
export type PhonePeTransaction = z.infer<typeof PhonePeTransactionSchema>;
export type PhonePeExtraction = z.infer<typeof PhonePeExtractionSchema>;
