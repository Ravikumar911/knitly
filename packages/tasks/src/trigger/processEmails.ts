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

  await markSyncCountingEmails(payload.userId);
  const listed = await listMessages(query, maxMessages);
  if (!listed.ok) {
    await recordSyncFailure(payload.userId, listed.error);
    throw toImapCliError(listed.error);
  }

  await initializeSync(payload.userId, listed.data.length);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const ref of listed.data) {
    try {
      if (await isEmailProcessed(payload.userId, ref.id)) {
        skippedCount += 1;
        continue;
      }

      const fetched = await fetchMessage(ref.id);
      if (!fetched.ok) {
        throw fetched.error;
      }

      const emailData = toEmailData(payload.userId, fetched.data);
      const storedEmail = await storeEmailData({
        id: emailData.emailId,
        userId: payload.userId,
        snippet: fetched.data.snippet,
        senderEmailId: emailData.from,
        threadId: ref.id,
        subject: emailData.subject,
        receivedDate: new Date(emailData.date),
        parseSuccess: true,
        parseErrors: null,
        rawContent: fetched.data.raw,
        attachmentStoragePath:
          emailData.attachments
            ?.map((attachment) => attachment.storageUrl)
            .filter((path): path is string => Boolean(path)) ?? null,
        parsedAt: new Date(),
      });

      const parsedEmailId = storedEmail[0]?.id ?? emailData.emailId ?? ref.id;
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
      if (!extracted.parseSuccess) {
        throw new Error(
          "Could not extract transaction data from the Gmail message.",
        );
      }

      processedCount += 1;
    } catch (error) {
      errorCount += 1;
      const classified = classifyImapError(error);
      console.error(
        "Failed to process IMAP message",
        ref.id,
        classified.message,
      );
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
    body: [message.text, message.html].filter(Boolean).join("\n\n").trim(),
    date: message.date,
    from: message.from,
    attachments,
  };
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
