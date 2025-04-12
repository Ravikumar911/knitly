import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { logger } from "@trigger.dev/sdk/v3"
import { createSupabaseClient } from "../utils/supabase"
import { storeAIAnalysis } from "@workspace/database"
import { ExtractedFinancialData, FinancialData, EmailData } from "../types/finwiseAI"

const SYSTEM_PROMPT = `You are a financial data extraction AI. Your task is to analyze emails and their attachments to extract structured financial information.

Follow these guidelines:
1. Identify the financial service provider (bank, payment app, etc.)
2. Determine the type of email (transaction alert, statement, balance update)
3. Extract transaction details if present:
   - Amount and currency
   - Transaction type (DEBIT/CREDIT)
   - Date and time
   - Description
   - UPI details if applicable (reference ID, transaction ID, handles)
4. Look for recurring payment patterns
5. Provide a confidence score (0-1) based on data clarity
6. If parsing fails, provide specific error messages

For PDF attachments:
1. Analyze the PDF content for:
   - Transaction details and amounts
   - Statement periods
   - Account information
   - Merchant details
2. Cross-reference email body with PDF content
3. Use the most authoritative source for data
4. Consider both email and PDF confidence in scoring

Be thorough but avoid making assumptions about unclear data.`;

async function getPdfContent(storagePath: string): Promise<string | null> {
  try {
    const supabase = createSupabaseClient()
    
    // Download PDF from Supabase storage
    const { data, error } = await supabase.storage
      .from('email-attachments')
      .download(storagePath)
      
    if (error || !data) {
      logger.error("Failed to download PDF", { storagePath, error })
      return null
    }

    // Convert PDF content to base64
    const buffer = Buffer.from(await data.arrayBuffer())
    return buffer.toString('base64')
  } catch (error) {
    logger.error("Error getting PDF content", {
      storagePath,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

export const finwiseAIAgent = async (emailData: EmailData): Promise<FinancialData> => {
  try {
    logger.log("Processing email with FinwiseAI", {
      subject: emailData.subject,
      from: emailData.from,
      hasAttachments: !!emailData.attachments?.length
    })

    // Process PDF attachments if any
    if (emailData.attachments) {
      for (const attachment of emailData.attachments) {
        if (attachment.mimeType === 'application/pdf') {
          logger.log("Processing PDF attachment", {
            storagePath: attachment.storagePath
          })
          const pdfContent = await getPdfContent(attachment.storagePath);
          if (pdfContent !== null) {
            attachment.content = pdfContent;
          }
        }
      }
    }

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: `${SYSTEM_PROMPT}

Now, analyze this email and extract financial information:

FROM: ${emailData.from}
SUBJECT: ${emailData.subject}
DATE: ${emailData.date}

EMAIL BODY:
${emailData.body}

${emailData.attachments ? `ATTACHMENTS:
${emailData.attachments.map(a => {
  const base = `- ${a.filename} (${a.mimeType})
  Stored at: email-attachments/${a.storagePath}`
  
  if (a.mimeType === 'application/pdf' && a.content) {
    return `${base}
  PDF Content: ${a.content}`
  }
  return base
}).join('\n')}` : 'NO ATTACHMENTS'}

Extract all relevant financial data according to the schema. Pay special attention to:
1. Transaction amounts and currencies
2. Payment references and IDs
3. Transaction type (DEBIT/CREDIT)
4. Merchant information
5. Recurring payment patterns
6. Transaction categories
${emailData.attachments?.some(a => a.mimeType === 'application/pdf') ? `7. PDF Analysis:
   - Cross-reference email data with PDF content
   - Extract additional transaction details from PDFs
   - Use the most authoritative source for each field` : ''}

Provide confidence score based on the clarity and completeness of the extracted information.`,
      schema: ExtractedFinancialData,
    })

    logger.log("FinwiseAI extraction completed", {
      success: object.parseSuccess,
      confidence: object.confidenceScore,
      provider: object.detectedProvider,
      type: object.emailType
    })


    // Store the analysis results
    if (emailData.threadId) {
      await storeAIAnalysis({
        userId: emailData.userId,
        parsedThreadId: emailData.threadId,
        analysis: object
      }).catch(error => {
        logger.error("Error storing AI analysis", {
          error: error,
          subject: emailData.subject
        })
      });
    }

    return object

  } catch (error) {
    logger.error("Error in FinwiseAI extraction", {
      error: error instanceof Error ? error.message : String(error),
      subject: emailData.subject
    })

    const failedAnalysis = {
      detectedProvider: "UNKNOWN",
      emailType: "OTHER" as const,
      emailSubject: emailData.subject,
      parseSuccess: false,
      parseErrors: [error instanceof Error ? error.message : 'Unknown error during extraction'],
      confidenceScore: 0
    }

    // Store the failed analysis
    if (emailData.threadId) {
      await storeAIAnalysis({
        userId: emailData.userId,
        parsedThreadId: emailData.threadId,
        analysis: failedAnalysis
      });
    }

    return failedAnalysis
  }
}


