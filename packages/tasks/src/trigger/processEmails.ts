import {
  initializeSync,
  markSyncComplete,
  markSyncCountingEmails,
} from "@workspace/database";
import { runSingleFlight } from "../runtime/mutex";

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

// Phase 1 intentionally retires the old mailbox shell-out. Until IMAP lands,
// we keep a deterministic local receipt so the CLI and UI keep a stable API.
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
  await markSyncCountingEmails(payload.userId);
  await initializeSync(payload.userId, 0);
  await markSyncComplete(payload.userId);

  return {
    success: true,
    processedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    totalFound: 0,
  };
}

export const processEmails = {
  trigger: runEmailSync,
};
