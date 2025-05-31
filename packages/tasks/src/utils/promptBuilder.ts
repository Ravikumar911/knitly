import { EmailData } from "../types/finwiseAI";
import { EmailExtractionPattern } from "@workspace/database";
import { PromptComponents, TemplateConfig, parseTemplateConfig } from "./templateMatching";

export class TemplatePromptBuilder {
  private baseSystemPrompt: string;
  
  constructor(basePrompt: string) {
    this.baseSystemPrompt = basePrompt;
  }
  
  /**
   * Build an optimized prompt using template-specific enhancements
   */
  buildPrompt(
    emailData: EmailData, 
    template?: EmailExtractionPattern
  ): string {
    const components = this.assembleComponents(emailData, template);
    return this.composeOptimizedPrompt(components);
  }
  
  /**
   * Assemble all prompt components from email data and template
   */
  private assembleComponents(
    emailData: EmailData, 
    template?: EmailExtractionPattern
  ): PromptComponents {
    const config = template ? parseTemplateConfig(template) : null;
    
    return {
      systemPrompt: this.baseSystemPrompt,
      merchantInstructions: config?.promptTemplate?.systemOverride,
      extractionFocus: config?.promptTemplate?.extractionFocus,
      validationRules: config?.validation ? JSON.stringify(config.validation) : undefined,
      emailContent: this.formatEmailContent(emailData),
      attachmentContext: this.formatAttachments(emailData.attachments)
    };
  }
  
  /**
   * Compose the final optimized prompt from components
   */
  private composeOptimizedPrompt(components: PromptComponents): string {
    let prompt = components.systemPrompt;

    // Add merchant-specific instructions if available
    if (components.merchantInstructions) {
      prompt += `\n\nMERCHANT-SPECIFIC GUIDANCE:\n${components.merchantInstructions}`;
    }

    // Add extraction focus guidance
    if (components.extractionFocus && components.extractionFocus.length > 0) {
      prompt += `\n\nPRIORITY EXTRACTION FIELDS: ${components.extractionFocus.join(', ')}`;
      prompt += `\nFocus on accurately extracting these fields with highest confidence.`;
    }

    // Add validation constraints
    if (components.validationRules) {
      prompt += `\n\nVALIDATION CONSTRAINTS:\n${components.validationRules}`;
      prompt += `\nEnsure extracted data meets these requirements.`;
    }

    // Add the email content to analyze
    prompt += `\n\nEMAIL TO ANALYZE:\n${components.emailContent}`;

    // Add attachment context if available
    if (components.attachmentContext) {
      prompt += `\n\n${components.attachmentContext}`;
    }

    // Final instruction
    prompt += `\n\nExtract all relevant financial data according to the schema, prioritizing accuracy and completeness.`;

    return prompt.trim();
  }
  
  /**
   * Format email content for prompt inclusion
   */
  private formatEmailContent(emailData: EmailData): string {
    return `FROM: ${emailData.from}
SUBJECT: ${emailData.subject}
DATE: ${emailData.date}

EMAIL BODY:
${emailData.body}`;
  }
  
  /**
   * Format attachments for prompt inclusion
   */
  private formatAttachments(attachments?: Array<{
    filename: string;
    mimeType: string;
    content: string;
  }>): string {
    if (!attachments || attachments.length === 0) {
      return '';
    }

    let attachmentText = 'ATTACHMENTS:';
    
    attachments.forEach(attachment => {
      attachmentText += `\n- ${attachment.filename} (${attachment.mimeType})`;
      
      if (attachment.mimeType === 'application/pdf') {
        attachmentText += `\n  PDF Content: ${attachment.content}`;
      }
    });

    return attachmentText;
  }
} 