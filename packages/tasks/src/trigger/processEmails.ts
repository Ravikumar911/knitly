import { markSyncComplete, markSyncInProgress } from "@workspace/database";

export type ProcessEmailsPayload = {
  userId: string;
  syncPeriodDays?: number;
};

export async function runEmailSync(payload: ProcessEmailsPayload) {
  const started = await markSyncInProgress(payload.userId);
  if (!started) {
    return {
      success: true,
      message: "Local sync already in progress.",
      skipped: true,
    };
  }

  await markSyncComplete(payload.userId);
  return {
    success: true,
    message: "Ingest is disabled until Phase 2. Local seed data is ready.",
    skipped: false,
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
