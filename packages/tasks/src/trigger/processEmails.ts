import {
  initializeSync,
  isEmailProcessed,
  markSyncComplete,
  markSyncCountingEmails,
  markSyncFailed,
  storeEmailData,
  storeTransactionV2Input,
  updateSyncProgress,
} from "@workspace/database";
import { defaultModel } from "../ai/model";
import { extractEmailData } from "../agents/slashAIV2";
import type { EmailData } from "../types/slashAI";
import {
  decodeBase64Url,
  getGmailAttachment,
  getGmailMessage,
  listGmailMessages,
  type GwsMessage,
  type GwsMessagePart,
} from "../utils/gws";
import { writeAttachmentFile } from "../utils/attachments-fs";
import { runSingleFlight } from "../runtime/mutex";

type EmailAttachment = NonNullable<EmailData["attachments"]>[number];

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

export async function runEmailSync(payload: ProcessEmailsPayload): Promise<EmailSyncResult & { skipped?: boolean }> {
  const singleFlight = await runSingleFlight(async () => runEmailSyncUnsafe(payload));
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

async function runEmailSyncUnsafe(payload: ProcessEmailsPayload): Promise<EmailSyncResult> {
  const query = payload.query || process.env.SLASHCASH_GMAIL_QUERY || 'from:(swiggy.in) newer_than:365d';
  const maxMessages = payload.maxMessages || Number(process.env.SLASHCASH_SYNC_LIMIT || 50);

  await markSyncCountingEmails(payload.userId);
  const listed = listGmailMessages(query, maxMessages);
  if (!listed.ok) {
    await markSyncFailed(payload.userId, listed.message);
    throw new Error(listed.message);
  }

  await initializeSync(payload.userId, listed.data.length);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const ref of listed.data) {
    try {
      if (await isEmailProcessed(payload.userId, ref.id)) {
        skippedCount += 1;
        await updateSyncProgress(payload.userId, 1);
        continue;
      }

      const message = getGmailMessage(ref.id);
      if (!message.ok) {
        throw new Error(message.message);
      }

      const emailData = await toEmailData(payload.userId, message.data);
      const attachmentPaths = emailData.attachments
        ?.map((attachment) => attachment.storageUrl)
        .filter((path): path is string => Boolean(path)) ?? [];
      const attachmentPath = attachmentPaths[0] ?? null;

      await storeEmailData({
        id: emailData.emailId,
        userId: payload.userId,
        snippet: emailData.body.slice(0, 240),
        senderEmailId: emailData.from,
        threadId: ref.id,
        subject: emailData.subject,
        receivedDate: new Date(emailData.date),
        parseSuccess: true,
        parseErrors: null,
        rawContent: emailData.body,
        attachmentStoragePath: attachmentPaths.length > 0 ? attachmentPaths : null,
        parsedAt: new Date(),
      });

      const extracted = await extractOrFallback(emailData, attachmentPath);
      if (!extracted) {
        throw new Error("Could not extract transaction data from message.");
      }

      processedCount += 1;
    } catch (error) {
      errorCount += 1;
      console.error("Failed to process Gmail message", ref.id, error);
    } finally {
      await updateSyncProgress(payload.userId, 1);
    }
  }

  if (errorCount > 0 && processedCount === 0) {
    await markSyncFailed(payload.userId, `${errorCount} messages failed to process.`);
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

async function toEmailData(userId: string, message: GwsMessage): Promise<EmailData> {
  const headers = message.payload?.headers ?? [];
  const subject = header(headers, "subject") || "Swiggy transaction";
  const from = header(headers, "from") || "unknown";
  const date = header(headers, "date")
    ? new Date(header(headers, "date")!).toISOString()
    : message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString();

  const body = collectText(message.payload).join("\n").trim() || message.snippet || "";
  const attachments = await collectAttachments(message.id, message.payload);

  return {
    userId,
    emailId: message.id,
    threadId: message.threadId || message.id,
    subject,
    body,
    date,
    from,
    attachments,
  };
}

function header(headers: Array<{ name: string; value: string }>, name: string) {
  return headers.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase())?.value;
}

function collectText(part?: GwsMessagePart): string[] {
  if (!part) return [];

  const current = part.body?.data && isTextPart(part)
    ? [decodeBase64Url(part.body.data).toString("utf8")]
    : [];

  return [
    ...current,
    ...(part.parts ?? []).flatMap((child) => collectText(child)),
  ];
}

async function collectAttachments(messageId: string, part?: GwsMessagePart): Promise<EmailAttachment[]> {
  if (!part) return [];

  const children = await Promise.all((part.parts ?? []).map((child) => collectAttachments(messageId, child)));
  const nested = children.flat();

  const filename = part.filename?.trim();
  const attachmentId = part.body?.attachmentId;
  if (!filename || !attachmentId) return nested;

  const attachment = getGmailAttachment(messageId, attachmentId);
  if (!attachment.ok) return nested;

  const storageUrl = writeAttachmentFile({
    messageId,
    filename,
    content: attachment.data,
  });

  return [
    ...nested,
    {
      filename,
      mimeType: part.mimeType || "application/octet-stream",
      content: attachment.data.toString("base64"),
      storageUrl,
    },
  ];
}

function isTextPart(part: GwsMessagePart) {
  return part.mimeType === "text/plain" || part.mimeType === "text/html" || !part.mimeType;
}

async function extractOrFallback(emailData: EmailData, attachmentPath: string | null) {
  if (process.env.SLASHCASH_SYNC_SKIP_AI !== "1") {
    try {
      const result = await extractEmailData(emailData, defaultModel(), { storeTransaction: true });
      if (result.transactionId || result.parseSuccess) {
        return result;
      }
    } catch (error) {
      console.warn("Local model extraction failed, using deterministic fallback.", error);
    }
  }

  const fallback = fallbackSwiggy(emailData);
  if (!fallback) return null;

  return storeTransactionV2Input({
    userId: emailData.userId,
    parsedEmailId: emailData.emailId,
    merchantId: "swiggy",
    merchantCode: "SWIGGY",
    merchantName: "Swiggy",
    amount: fallback.amount,
    currency: "INR",
    type: "DEBIT",
    status: "COMPLETED",
    transactionDate: new Date(emailData.date),
    description: fallback.description,
    category: "Food",
    paymentMethod: "UPI",
    referenceIds: { orderId: fallback.orderId },
    merchantData: {
      swiggyMetadata: { service: "FOOD_DELIVERY" },
      transaction: {
        orderId: fallback.orderId,
        restaurantName: fallback.restaurant,
        deliveryAddress: fallback.deliveryAddress,
        attachmentPath,
      },
    },
    extractionConfidence: 0.7,
    schemaUsed: "swiggy.fallback.v1",
    dataSource: attachmentPath ? "PDF_ATTACHMENT" : "EMAIL_BODY",
    isVerified: false,
  });
}

function fallbackSwiggy(emailData: EmailData) {
  const text = `${emailData.subject}\n${emailData.body}`;
  const amountMatch = text.match(/(?:total|amount|paid|₹|INR)\s*:?\s*₹?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const orderId = text.match(/order(?:\s*id)?\s*:?\s*([A-Z0-9-]{5,})/i)?.[1] || emailData.threadId;
  const restaurant = text.match(/restaurant\s*:?\s*([^\n]+)/i)?.[1]?.trim() || "Swiggy";
  const area = text.match(/area\s*:?\s*([^\n]+)/i)?.[1]?.trim() || "";
  const pincode = text.match(/pincode\s*:?\s*([0-9]{6})/i)?.[1] || "";

  return {
    amount,
    orderId,
    restaurant,
    description: `Swiggy order - ${restaurant}`,
    deliveryAddress: { area, pincode },
  };
}

export const processEmails = {
  trigger: runEmailSync,
};

export const processEmailBatch = {
  trigger: async () => ({
    processedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    totalFound: 0,
  }),
};
