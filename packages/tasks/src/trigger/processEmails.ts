import {
  initializeSync,
  markSyncComplete,
  markSyncCountingEmails,
  markSyncFailed,
  markSyncFailedWithOAuthError,
  storeEmailData,
  updateEmailData,
  updateSyncProgress,
  isEmailProcessed,
  dbPath,
} from "@workspace/database";
import { extractTransactionFromEmail } from "../extract/pipeline";
import {
  fetchMessage,
  listMessages,
  type FetchedImapMessage,
} from "../gmail/imap-client";
import { runSingleFlight } from "../runtime/mutex";
import type { EmailData } from "../types/slashAI";
import { writeAttachmentFile } from "../utils/attachments-fs";
import { errorSummary, syncDebug } from "../utils/sync-debug";
import {
  classifyImapError,
  isCredentialError,
  type ImapError,
  toImapCliError,
} from "../utils/imap-errors";

export type ProcessEmailsPayload = {
  userId: string;
  query?: string;
  maxMessages?: number;
  full?: boolean;
};

export type EmailSyncResult = {
  success: true;
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  totalFound: number;
};

export async function runEmailSync(
  payload: ProcessEmailsPayload,
): Promise<EmailSyncResult & { skipped?: boolean }> {
  const singleFlight = await runSingleFlight(
    async () => runEmailSyncUnsafe(payload),
    "gmail-swiggy",
  );
  if (singleFlight.status === "skipped") {
    return {
      success: true,
      processedCount: 0,
      skippedCount: 1,
      errorCount: 0,
      totalFound: 0,
      skipped: true,
    };
  }

  return singleFlight.value;
}

async function runEmailSyncUnsafe(
  payload: ProcessEmailsPayload,
): Promise<EmailSyncResult> {
  const query =
    payload.query ||
    process.env.SLASHCASH_GMAIL_QUERY ||
    "from:(swiggy.in) newer_than:365d";
  const maxMessages =
    payload.maxMessages || Number(process.env.SLASHCASH_SYNC_LIMIT || 50);

  syncDebug("sync-start", {
    userId: payload.userId,
    query,
    maxMessages,
    full: Boolean(payload.full),
    skipAi: process.env.SLASHCASH_SYNC_SKIP_AI === "1",
    model: process.env.OLLAMA_CHAT_MODEL || null,
    dbPath,
    pdfExtractorPython: process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON || null,
  });

  await markSyncCountingEmails(payload.userId);
  const listed = await listMessages(query, maxMessages);
  if (!listed.ok) {
    await recordSyncFailure(payload.userId, listed.error);
    throw toImapCliError(listed.error);
  }

  syncDebug("messages-listed", {
    totalFound: listed.data.length,
    ids: listed.data.map((ref) => ref.id),
  });

  await initializeSync(payload.userId, listed.data.length);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const [index, ref] of listed.data.entries()) {
    try {
      syncDebug("message-start", {
        index: index + 1,
        total: listed.data.length,
        messageId: ref.id,
        threadId: ref.threadId,
      });

      if (await isEmailProcessed(payload.userId, ref.id)) {
        skippedCount += 1;
        syncDebug("message-skipped-existing", {
          messageId: ref.id,
        });
        continue;
      }

      const fetched = await fetchMessage(ref.id);
      if (!fetched.ok) {
        throw fetched.error;
      }

      const emailData = toEmailData(payload.userId, fetched.data);
      syncDebug("message-fetched", {
        messageId: ref.id,
        gmailThreadId: fetched.data.gmailThreadId,
        from: fetched.data.from,
        date: fetched.data.date,
        textChars: fetched.data.text.length,
        htmlChars: fetched.data.html.length,
        bodyChars: emailData.body.length,
        bodyTruncated:
          emailData.body.length >= resolveMaxEmailBodyChars() &&
          fetched.data.text.length + fetched.data.html.length >
            emailData.body.length,
        attachmentCount: emailData.attachments?.length || 0,
        pdfAttachmentCount:
          emailData.attachments?.filter(
            (attachment) => attachment.mimeType === "application/pdf",
          ).length || 0,
      });

      const storedEmail = await storeEmailData({
        id: emailData.emailId,
        userId: payload.userId,
        snippet: fetched.data.snippet,
        senderEmailId: emailData.from,
        threadId: ref.id,
        subject: emailData.subject,
        receivedDate: new Date(emailData.date),
        parseSuccess: false,
        parseErrors: null,
        rawContent: fetched.data.raw,
        attachmentStoragePath:
          emailData.attachments
            ?.map((attachment) => attachment.storageUrl)
            .filter((path): path is string => Boolean(path)) ?? null,
        parsedAt: new Date(),
      });

      const parsedEmailId = storedEmail[0]?.id ?? emailData.emailId ?? ref.id;
      syncDebug("email-stored", {
        messageId: ref.id,
        parsedEmailId,
        attachmentStoragePathCount:
          emailData.attachments?.filter((attachment) =>
            Boolean(attachment.storageUrl),
          ).length || 0,
      });

      const extracted = await extractTransactionFromEmail(emailData, {
        parsedEmailId,
        storeTransaction: true,
      });
      await updateEmailData(parsedEmailId, {
        parseSuccess: extracted.parseSuccess,
        parseErrors:
          extracted.parseErrors.length > 0
            ? JSON.stringify(extracted.parseErrors)
            : null,
      });
      syncDebug("extraction-stored", {
        messageId: ref.id,
        parsedEmailId,
        parseSuccess: extracted.parseSuccess,
        transactionId: extracted.transactionId || null,
        schemaUsed: extracted.schemaUsed,
        dataSource: extracted.dataSource,
        contributedByPdf: extracted.contributedByPdf,
        confidence: extracted.extractionConfidence,
        amount: extracted.extractionData.transaction?.amount ?? null,
        orderId: extracted.extractionData.transaction?.orderId ?? null,
        warningCount: extracted.warnings.length,
        parseErrorCount: extracted.parseErrors.length,
      });

      if (!extracted.parseSuccess) {
        throw new Error(
          "Could not extract transaction data from the Gmail message.",
        );
      }

      processedCount += 1;
      syncDebug("message-complete", {
        messageId: ref.id,
        processedCount,
        skippedCount,
        errorCount,
      });
    } catch (error) {
      errorCount += 1;
      const classified = classifyImapError(error);
      console.error(
        "Failed to process IMAP message",
        ref.id,
        classified.message,
      );
      syncDebug("message-failed", {
        messageId: ref.id,
        classified: classified.code,
        error: errorSummary(error),
      });
    } finally {
      await updateSyncProgress(payload.userId, 1);
    }
  }

  if (errorCount > 0 && processedCount === 0) {
    await markSyncFailed(
      payload.userId,
      `${errorCount} messages failed to process.`,
    );
  } else {
    await markSyncComplete(payload.userId);
  }

  return {
    success: true,
    processedCount,
    skippedCount,
    errorCount,
    totalFound: listed.data.length,
  };
}

function toEmailData(userId: string, message: FetchedImapMessage): EmailData {
  const attachments = message.attachments.map((attachment) => {
    const storageUrl = writeAttachmentFile({
      messageId: message.id,
      filename: attachment.filename,
      content: attachment.content,
    });

    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      content: attachment.content.toString("base64"),
      storageUrl,
    };
  });

  return {
    userId,
    emailId: message.id,
    threadId: message.id,
    subject: message.subject,
    body: compactEmailBody(message),
    date: message.date,
    from: message.from,
    attachments,
  };
}

function compactEmailBody(message: FetchedImapMessage) {
  const text = message.text.trim();
  const body = text || textFromHtml(message.html);
  const maxChars = resolveMaxEmailBodyChars();

  if (body.length <= maxChars) {
    return body;
  }

  return body.slice(0, maxChars).trim();
}

function resolveMaxEmailBodyChars() {
  const configured = Number(
    process.env.SLASHCASH_EMAIL_BODY_MAX_CHARS || 12_000,
  );
  return Number.isFinite(configured) && configured > 0 ? configured : 12_000;
}

function textFromHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function recordSyncFailure(userId: string, error: ImapError) {
  if (isCredentialError(error)) {
    await markSyncFailedWithOAuthError(userId, {
      code: error.code,
      type: "OAUTH_ERROR",
      message: error.message,
      requiresReauth: true,
      userFriendlyMessage: `${error.symptom} ${error.fix}`,
    });
    return;
  }

  await markSyncFailed(userId, error.message);
}

export const processEmails = {
  trigger: runEmailSync,
};
