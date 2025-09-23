export enum EmailSyncStatus {
  CountingEmails = "counting_emails",
  InProgress = "in_progress",
  Syncing = "syncing",
  Complete = "complete",
  Failed = "failed",
}

export const ActiveSyncStatuses: EmailSyncStatus[] = [
  EmailSyncStatus.CountingEmails,
  EmailSyncStatus.InProgress,
  EmailSyncStatus.Syncing,
];

export interface EmailSyncProgress {
  totalEmails: number | null;
  processedEmails: number;
  progressPercentage: number;
  estimatedCompletion: Date | null;
  syncStatus: EmailSyncStatus | null;
  hasInitialSync: boolean;
  statusMessage?: string; // Pre-computed message coming from BE
  // OAuth error information
  oauthError?: {
    type: string | null;
    code: string | null;
    requiresReauth: boolean;
    userFriendlyMessage: string | null;
  } | null;
}