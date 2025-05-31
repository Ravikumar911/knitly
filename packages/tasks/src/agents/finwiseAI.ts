import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { logger } from "@trigger.dev/sdk/v3"
import { storeAIAnalysis, ExtractedFinancialData, FinancialData } from "@workspace/database"
import { EmailData } from "../types/finwiseAI"
import { findBestMatchingTemplate, TemplateMatch } from "../utils/templateMatching"
import { TemplatePromptBuilder } from "../utils/promptBuilder"

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

IMPORTANT: Ensure it's a transaction validate if it's real transaction or not, There could be some emails which are not related to transactions like newsletter, loan updates, etc.

Be thorough but avoid making assumptions about unclear data.`;

// Enhanced interface for tracking template usage
export interface EnhancedFinancialData extends FinancialData {
  analysisId: string | null;
  templateUsed?: string;
  templateMatchScore?: number;
}

export const finwiseAIAgent = async (emailData: EmailData): Promise<EnhancedFinancialData> => {
  try {
    logger.log("Processing email with FinwiseAI", {
      subject: emailData.subject,
      from: emailData.from,
      hasAttachments: !!emailData.attachments?.length
    })

    // Step 1: Find matching template
    const matchingTemplate = await findBestMatchingTemplate(emailData);
    
    // Step 2: Build enhanced prompt using template
    const promptBuilder = new TemplatePromptBuilder(SYSTEM_PROMPT);
    const optimizedPrompt = promptBuilder.buildPrompt(emailData, matchingTemplate?.template);
    
    // Step 3: Execute AI extraction with enhanced prompt
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      prompt: optimizedPrompt,
      schema: ExtractedFinancialData,
    }).catch(error => {
      logger.error("Error in FinwiseAI extraction", {
        error: error,
        templateUsed: matchingTemplate?.template.id,
        subject: emailData.subject
      })
      throw error;
    })

    // Step 4: Apply template-based post-processing if needed
    const processedResult = matchingTemplate 
      ? applyTemplatePostProcessing(object, matchingTemplate)
      : object;

    logger.log("FinwiseAI extraction completed", {
      success: processedResult.parseSuccess,
      confidence: processedResult.confidenceScore,
      provider: processedResult.detectedProvider,
      type: processedResult.emailType,
      templateUsed: matchingTemplate?.template.id,
      templateScore: matchingTemplate?.matchScore
    })

    // Step 5: Store analysis with template metadata
    let analysis = null;
    if (emailData.threadId) {
      const analysisData = {
        ...processedResult,
        templateUsed: matchingTemplate?.template.id,
        templateMatchScore: matchingTemplate?.matchScore
      };

      analysis = await storeAIAnalysis({
        userId: emailData.userId,
        parsedThreadId: emailData.threadId,
        analysis: analysisData
      }).catch(error => {
        logger.error("Error storing AI analysis", {
          error: error,
          subject: emailData.subject,
          templateUsed: matchingTemplate?.template.id
        })
      });
    }

    return {
      ...processedResult,
      analysisId: analysis?.id || null,
      templateUsed: matchingTemplate?.template.id,
      templateMatchScore: matchingTemplate?.matchScore
    }

  } catch (error) {
    logger.error("Error in FinwiseAI extraction", {
      error: error instanceof Error ? error.message : String(error),
      subject: emailData.subject
    })

    return handleExtractionError(error, emailData);
  }
}

/**
 * Apply template-specific post-processing to extraction results
 */
function applyTemplatePostProcessing(
  result: FinancialData, 
  matchingTemplate: TemplateMatch
): FinancialData {
  // For now, return the result as-is
  // Future enhancements could include:
  // - Field validation based on template rules
  // - Data correction using field mappings
  // - Category override based on merchant patterns
  
  return result;
}

/**
 * Handle extraction errors with template context
 */
async function handleExtractionError(
  error: unknown, 
  emailData: EmailData
): Promise<EnhancedFinancialData> {
  const failedAnalysis = {
    detectedProvider: "UNKNOWN",
    emailType: "OTHER" as const,
    emailSubject: emailData.subject,
    parseSuccess: false,
    parseErrors: [error instanceof Error ? error.message : 'Unknown error during extraction'],
    confidenceScore: 0
  }

  let analysis = null;
  // Store the failed analysis
  if (emailData.threadId) {
    analysis = await storeAIAnalysis({
      userId: emailData.userId,
      parsedThreadId: emailData.threadId,
      analysis: failedAnalysis
    });
  }

  return {
    ...failedAnalysis,
    analysisId: analysis?.id || null
  }
}


