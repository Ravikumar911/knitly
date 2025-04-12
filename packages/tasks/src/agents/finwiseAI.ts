import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { GmailHeader, GmailBodyPart } from "../types"

// Schema for extracted financial data
const ExtractedFinancialData = z.object({
  // Email metadata
  detectedProvider: z.string().optional().describe("The provider of the email"),
  emailType: z.string().optional().describe("The type of the email"),
  emailSubject: z.string().optional().describe("The subject of the email"),
  // Transaction data (if present)
  transaction: z.object({
    amount: z.number().optional().describe("The amount of the transaction"),
    currency: z.string().optional().describe("The currency of the transaction"),
    type: z.enum(["DEBIT", "CREDIT"]).optional().describe("The type of the transaction"), 
    transactionDate: z.string().optional().describe("The date of the transaction"),
    description: z.string().optional().describe("The description of the transaction"),
    upiReferenceId: z.string().optional().describe("The UPI reference ID of the transaction"),
    upiTransactionId: z.string().optional().describe("The UPI transaction ID of the transaction"),
    counterpartyUpiHandle: z.string().optional().describe("The UPI handle of the counterparty"),
    isRecurring: z.boolean().optional().describe("Whether the transaction is recurring"),
  }).optional(),
  
  // Additional metadata
  parseSuccess: z.boolean().describe("Whether the transaction was parsed successfully"),
  parseErrors: z.array(z.string()).optional().describe("Any errors that occurred during parsing"),
})

export type FinancialData = z.infer<typeof ExtractedFinancialData>

interface EmailData {
  headers: GmailHeader[]
  subject: string
  from: string
  date: string
  body: string
}

export const finwiseAIAgent = async (emailData: EmailData): Promise<FinancialData> => {
  try {
    // Construct prompt with email data
    const prompt = `You are a financial data extraction agent. Analyze this email and extract any financial information:
        From: ${emailData.from}
        Subject: ${emailData.subject}
        Date: ${emailData.date}
        Body: ${emailData.body}

        Format the data according to the specified schema.` 

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: prompt,
      schema: ExtractedFinancialData,
    })

    return object
  } catch (error) {
    // Return a failed parse result if extraction fails
    return {
      parseSuccess: false,
      parseErrors: [error instanceof Error ? error.message : 'Unknown error during extraction'],
    }
  }
}


