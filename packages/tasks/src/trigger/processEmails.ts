import { cpus } from "node:os";
import {
  initializeSync,
  markSyncComplete,
  markSyncCountingEmails,
  markSyncFailed,
  markSyncFailedWithOAuthError,
  storeEmailData,
  updateEmailData,
  updateSyncProgress,
  getProcessedEmailIds,
  storeTransactionV2Input,
  dbPath,
} from "@workspace/database";
import {
  extractTransactionFromEmail,
  getOrderId,
  getReferenceIds,
} from "../extract/pipeline";
import {
  fetchMessage,
  listMessages,
  type FetchedImapMessage,
  type ImapMessageRef,
} from "../gmail/imap-client";
import { runSingleFlight } from "../runtime/mutex";
import { createWorkPool } from "../runtime/pool";
import type { EmailData } from "../types/email-extraction";
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
  /** Re-run extraction for messages already marked processed (updates transactions in place). */
  reextract?: boolean;
};

export type EmailSyncResult = {
  success: true;
  totalFound: number;
  outcomes: SyncOutcome[];
  counts: {
    processed: number;
    skipped_existing: number;
    skipped_non_transaction: number;
    failed: number;
  };
  processedCount: number;
  skippedCount: number;
  errorCount: number;
};

export type SyncOutcome =
  | { kind: "processed"; messageId: string; transactionId: string }
  | { kind: "skipped_existing"; messageId: string }
  | { kind: "skipped_non_transaction"; messageId: string; reason: string }
  | { kind: "failed"; messageId: string; error: ImapError | Error };

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
      totalFound: 0,
      outcomes: [],
      counts: {
        processed: 0,
        skipped_existing: 1,
        skipped_non_transaction: 0,
        failed: 0,
      },
      processedCount: 0,
      skippedCount: 1,
      errorCount: 0,
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
    "from:(swiggy.in OR swiggy.com OR uber.com OR ubereats.com OR doordash.com) newer_than:365d";
  const maxMessages =
    payload.full && payload.maxMessages === undefined
      ? null
      : payload.maxMessages || Number(process.env.SLASHCASH_SYNC_LIMIT || 50);

  syncDebug("sync-start", {
    userId: payload.userId,
    query,
    maxMessages,
    full: Boolean(payload.full),
    reextract: Boolean(payload.reextract),
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

  const outcomes: SyncOutcome[] = [];
  const pendingRefs: ImapMessageRef[] = [];
  if (payload.reextract) {
    pendingRefs.push(...listed.data);
  } else {
    const processedIds = await getProcessedEmailIds(
      payload.userId,
      listed.data.map((ref) => ref.id),
    );
    for (const ref of listed.data) {
      if (processedIds.has(ref.id) || processedIds.has(ref.threadId)) {
        outcomes.push({ kind: "skipped_existing", messageId: ref.id });
        syncDebug("message-skipped-existing", { messageId: ref.id });
        await updateSyncProgress(payload.userId, 1);
      } else {
        pendingRefs.push(ref);
      }
    }
  }

  const messagePool = createWorkPool<ImapMessageRef, SyncOutcome>({
    concurrency: resolveMessageConcurrency(),
    async work(ref) {
      return processMessage(payload.userId, ref);
    },
  });

  const processedOutcomes = await Promise.all(
    pendingRefs.map((ref, index) =>
      messagePool
        .submit(ref)
        .catch((error) => {
          const classified = classifyImapError(error);
          console.error(
            "Failed to process IMAP message",
            ref.id,
            classified.message,
          );
          syncDebug("message-failed", {
            index: index + 1,
            total: listed.data.length,
            messageId: ref.id,
            classified: classified.code,
            error: errorSummary(error),
          });
          return {
            kind: "failed",
            messageId: ref.id,
            error: classified,
          } satisfies SyncOutcome;
        })
        .finally(() => recordMessageProgress(payload.userId, ref.id)),
    ),
  );
  await messagePool.drain();
  outcomes.push(...processedOutcomes);

  const counts = countOutcomes(outcomes);
  const processedCount = counts.processed;
  const skippedCount = counts.skipped_existing + counts.skipped_non_transaction;
  const errorCount = counts.failed;

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
    totalFound: listed.data.length,
    outcomes,
    counts,
    processedCount,
    skippedCount,
    errorCount,
  };
}

async function writeExtractedMessage(
  userId: string,
  item: {
    ref: { id: string; threadId: string };
    fetched: FetchedImapMessage;
    emailData: EmailData;
    extracted: Awaited<ReturnType<typeof extractTransactionFromEmail>>;
  },
): Promise<SyncOutcome> {
  const { ref, fetched, emailData, extracted } = item;
  const storedEmail = await storeEmailData({
    id: emailData.emailId,
    userId,
    snippet: fetched.snippet,
    senderEmailId: emailData.from,
    threadId: ref.threadId || fetched.gmailThreadId || ref.id,
    subject: emailData.subject,
    receivedDate: new Date(emailData.date),
    parseSuccess: false,
    parseErrors: null,
    rawContent: fetched.raw,
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

  if (!extracted.parseSuccess || !extracted.extractionData.transaction) {
    const reason =
      extracted.parseErrors[0] || "No completed supported transaction.";
    const parseErrors =
      extracted.parseErrors.length > 0
        ? JSON.stringify(extracted.parseErrors)
        : null;

    if (isTechnicalExtractionFailure(extracted.parseErrors)) {
      await updateEmailData(parsedEmailId, {
        parseSuccess: false,
        parseErrors,
      });
      return {
        kind: "failed",
        messageId: ref.id,
        error: new Error(reason),
      };
    }

    await updateEmailData(parsedEmailId, {
      parseSuccess: true,
      parseErrors: null,
    });
    return {
      kind: "skipped_non_transaction",
      messageId: ref.id,
      reason,
    };
  }

  const transaction = extracted.extractionData.transaction;
  const stored = await storeTransactionV2Input({
    userId: emailData.userId,
    parsedEmailId,
    merchantId: extracted.merchant?.id ?? extracted.extractionData.merchantId,
    merchantCode:
      extracted.merchant?.code ?? extracted.extractionData.merchantCode,
    merchantName:
      extracted.merchant?.name ?? extracted.extractionData.detectedProvider,
    amount: transaction.amount,
    currency: transaction.currency || "USD",
    type: "DEBIT",
    status: "COMPLETED",
    transactionDate: new Date(transaction.transactionDate || emailData.date),
    description: transaction.description || emailData.subject,
    category: "Food",
    paymentMethod: transaction.paymentMethod || undefined,
    referenceIds: getReferenceIds(extracted.extractionData),
    merchantData: {
      ...extracted.extractionData,
      warnings: extracted.warnings,
      provenance: extracted.provenance,
    } as Record<string, unknown>,
    extractionConfidence: extracted.extractionConfidence,
    schemaUsed: extracted.schemaUsed,
    dataSource: extracted.dataSource,
  });
  const transactionId = stored?.id;

  await updateEmailData(parsedEmailId, {
    parseSuccess: true,
    parseErrors:
      extracted.parseErrors.length > 0
        ? JSON.stringify(extracted.parseErrors)
        : null,
  });
  syncDebug("extraction-stored", {
    messageId: ref.id,
    parsedEmailId,
    parseSuccess: extracted.parseSuccess,
    transactionId: transactionId || null,
    schemaUsed: extracted.schemaUsed,
    dataSource: extracted.dataSource,
    contributedByPdf: extracted.contributedByPdf,
    confidence: extracted.extractionConfidence,
    amount: transaction.amount,
    orderId: getOrderId(extracted.extractionData) ?? null,
    warningCount: extracted.warnings.length,
    parseErrorCount: extracted.parseErrors.length,
  });

  return {
    kind: "processed",
    messageId: ref.id,
    transactionId: transactionId || "unknown",
  };
}

async function processMessage(
  userId: string,
  ref: ImapMessageRef,
): Promise<SyncOutcome> {
  const fetched = await fetchMessage(ref.id);
  if (!fetched.ok) {
    throw fetched.error;
  }

  const emailData = toEmailData(userId, fetched.data);
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

  const extracted = await extractTransactionFromEmail(emailData, {
    storeTransaction: false,
  });
  await sleepAfterExtraction();

  return writeExtractedMessage(userId, {
    ref,
    fetched: fetched.data,
    emailData,
    extracted,
  });
}

async function recordMessageProgress(userId: string, messageId: string) {
  try {
    await updateSyncProgress(userId, 1);
  } catch (error) {
    syncDebug("progress-update-failed", {
      messageId,
      error: errorSummary(error),
    });
  }
}

function countOutcomes(outcomes: SyncOutcome[]): EmailSyncResult["counts"] {
  return {
    processed: outcomes.filter((outcome) => outcome.kind === "processed")
      .length,
    skipped_existing: outcomes.filter(
      (outcome) => outcome.kind === "skipped_existing",
    ).length,
    skipped_non_transaction: outcomes.filter(
      (outcome) => outcome.kind === "skipped_non_transaction",
    ).length,
    failed: outcomes.filter((outcome) => outcome.kind === "failed").length,
  };
}

function isTechnicalExtractionFailure(parseErrors: string[]) {
  return parseErrors.some((error) =>
    /extraction model unavailable|missing-api-key|unknown-provider|response_format|json_schema|schema|llm extraction failed|could not be resolved|timed out|timeout|aborted|pdf extractor/i.test(
      error,
    ),
  );
}

function resolveConcurrency(envName: string, fallback: number) {
  const configured = Number(process.env[envName]);
  if (Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }
  return fallback;
}

function defaultExtractConcurrency() {
  if (
    process.env.SLASHCASH_ASSISTANT_PROVIDER === "ollama-local" ||
    process.env.SLASHCASH_ASSISTANT_PROVIDER === "anthropic"
  ) {
    return 1;
  }
  return Math.max(1, Math.min(4, cpus().length - 1 || 1));
}

function resolveExtractConcurrency() {
  const explicitLlmConcurrency = Number(
    process.env.SLASHCASH_EXTRACT_LLM_CONCURRENCY,
  );
  if (Number.isFinite(explicitLlmConcurrency) && explicitLlmConcurrency > 0) {
    return Math.floor(explicitLlmConcurrency);
  }
  return resolveConcurrency(
    "SLASHCASH_SYNC_EXTRACT_CONCURRENCY",
    defaultExtractConcurrency(),
  );
}

function resolveMessageConcurrency() {
  const fetchConcurrency = resolveConcurrency(
    "SLASHCASH_SYNC_FETCH_CONCURRENCY",
    4,
  );
  const extractConcurrency = resolveExtractConcurrency();
  return Math.max(1, Math.min(fetchConcurrency, extractConcurrency));
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
    threadId: message.gmailThreadId || message.threadId || message.id,
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

async function sleepAfterExtraction() {
  const ms = resolveExtractPacingMs();
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveExtractPacingMs() {
  const configured = Number(process.env.SLASHCASH_EXTRACT_PACING_MS);
  if (Number.isFinite(configured) && configured >= 0) {
    return Math.floor(configured);
  }
  return process.env.SLASHCASH_ASSISTANT_PROVIDER === "anthropic" ? 1500 : 0;
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
