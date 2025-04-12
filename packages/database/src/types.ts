import { emailExtractionPatterns, profiles, transactions } from "./schema";
import { emailSyncStatus } from "./schema/emailSyncStatus";
import { parsedEmails } from "./schema/parsedEmails";
import { aiAnalysis } from "./schema/aiAnalysis";
import { z } from "zod";

// Export types for better type safety
export type User = typeof profiles.$inferSelect;
export type NewUser = typeof profiles.$inferInsert; 

export type EmailExtractionPattern = typeof emailExtractionPatterns.$inferSelect;
export type NewEmailExtractionPattern = typeof emailExtractionPatterns.$inferInsert;

export type EmailSyncStatus = typeof emailSyncStatus.$inferSelect;
export type NewEmailSyncStatus = typeof emailSyncStatus.$inferInsert;

export type ParsedEmail = typeof parsedEmails.$inferSelect;
export type NewParsedEmail = typeof parsedEmails.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type AIAnalysis = typeof aiAnalysis.$inferSelect;
export type NewAIAnalysis = typeof aiAnalysis.$inferInsert;


export const ExtractedFinancialData = z.object({
    // Source metadata
    detectedProvider: z.string().describe("The detected financial service provider (e.g., 'Swiggy', 'PhonePe', 'HDFC')"),
    emailType: z.enum([
      'TRANSACTION_ALERT',
      'PAYMENT_CONFIRMATION',
      'ORDER_CONFIRMATION',
      'BILL_PAYMENT',
      'STATEMENT',
      'BALANCE_UPDATE',
      'SUBSCRIPTION_CHARGE',
      'REFUND_NOTIFICATION',
      'OTHER'
    ]).describe("The type of financial email - categorizes the purpose of the email"),
    emailSubject: z.string().describe("The original subject line of the email"),
    
    // Transaction details
    transaction: z.object({
      // Core transaction data
      amount: z.number().describe("The transaction amount as a number (e.g., 1299.99)"),
      currency: z.string().default('INR').describe("The currency code of the transaction (e.g., 'INR', 'USD')"),
      type: z.enum(['DEBIT', 'CREDIT', 'TRANSFER', 'REFUND']).describe("The type of transaction - whether money was sent, received, transferred, or refunded"),
      status: z.enum(['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED']).default('COMPLETED').describe("The current status of the transaction"),
      transactionDate: z.string().describe("The date and time of the transaction in ISO format"),
      
      // Transaction context
      category: z.enum([
        'FOOD_DELIVERY',
        'GROCERIES',
        'SHOPPING',
        'TRANSPORT',
        'UTILITIES',
        'ENTERTAINMENT',
        'HEALTHCARE',
        'EDUCATION',
        'TRANSFER',
        'SUBSCRIPTION',
        'OTHER'
      ]).describe("The category of spending this transaction represents"),
      description: z.string().describe("A human-readable description of the transaction"),
      merchantName: z.string().optional().describe("The name of the merchant or business receiving/sending the payment"),
      merchantCategory: z.string().optional().describe("The business category of the merchant (e.g., 'Restaurant', 'Retail')"),
      
      // Order details (if applicable)
      orderId: z.string().optional().describe("Unique identifier for the order if this is a purchase"),
      orderItems: z.array(z.object({
        name: z.string().describe("Name of the item purchased"),
        quantity: z.number().describe("Number of units purchased"),
        price: z.number().optional().describe("Price per unit if available"),
      })).optional().describe("List of items included in the order"),
      deliveryAddress: z.string().optional().describe("Shipping or delivery address for the order"),
      
      // Payment method details
      paymentMethod: z.object({
        type: z.enum(['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NETBANKING', 'WALLET', 'OTHER'])
          .describe("The method used for payment"),
        last4: z.string().optional().describe("Last 4 digits of the card if payment was made via card"),
        upiId: z.string().optional().describe("UPI ID used for the transaction"),
        bankName: z.string().optional().describe("Name of the bank involved in the transaction"),
      }).optional().describe("Details about how the payment was made"),
      
      // Reference IDs
      referenceIds: z.object({
        upiReferenceId: z.string().optional().describe("UPI reference ID for the transaction"),
        upiTransactionId: z.string().optional().describe("UPI transaction ID"),
        bankReferenceId: z.string().optional().describe("Bank's reference number for the transaction"),
        merchantTransactionId: z.string().optional().describe("Merchant's internal transaction reference"),
      }).optional().describe("Various reference numbers associated with the transaction"),
      
      // Additional metadata
      tags: z.array(z.string()).optional().describe("Additional labels or tags for categorizing the transaction"),
      location: z.object({
        city: z.string().optional().describe("City where the transaction occurred"),
        state: z.string().optional().describe("State where the transaction occurred"),
        country: z.string().optional().describe("Country where the transaction occurred"),
      }).optional().describe("Geographic information about where the transaction took place"),
    }).optional().describe("Detailed information about the financial transaction, if one is detected"),
    
    // Parsing metadata
    parseSuccess: z.boolean().describe("Whether the email was successfully parsed for financial information"),
    parseErrors: z.array(z.string()).optional().describe("List of any errors encountered during parsing"),
    confidenceScore: z.number().min(0).max(1).describe("Confidence level in the extracted data, from 0 to 1"),
    
    // Source verification
    dataSource: z.enum(['EMAIL_BODY', 'PDF_ATTACHMENT', 'BOTH'])
      .optional().describe("Where the financial data was extracted from"),
    verificationStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'SUSPICIOUS'])
      .optional().describe("The verification status of the extracted data"),
  }).strict()
  
  export type FinancialData = z.infer<typeof ExtractedFinancialData>