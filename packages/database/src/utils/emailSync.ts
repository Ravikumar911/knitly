import { EmailSyncStatus } from "../types/emailSync";

export function getSyncStatusMessage(progress: {
  syncStatus: EmailSyncStatus | null;
  processedEmails: number;
  totalEmails: number | null;
  oauthErrorType?: string | null;
  userFriendlyError?: string | null;
}): string {
  if (progress.oauthErrorType && progress.userFriendlyError) {
    return progress.userFriendlyError;
  }

  if (!progress.syncStatus) {
    return "No sync in progress";
  }

  switch (progress.syncStatus) {
    case EmailSyncStatus.CountingEmails:
      return "Counting your emails...";
    case EmailSyncStatus.Syncing:
      if (progress.totalEmails) {
        const remaining = progress.totalEmails - progress.processedEmails;
        return `Processing emails... ${remaining} remaining`;
      }
      return "Processing your emails...";
    case EmailSyncStatus.Complete:
      return "Email sync completed successfully!";
    case EmailSyncStatus.Failed:
      if (progress.oauthErrorType) {
        return progress.userFriendlyError || "Authentication error occurred";
      }
      return "Email sync failed. Please try again.";
    case EmailSyncStatus.InProgress:
      return "Email sync in progress...";
    default:
      return "Sync status unknown";
  }
}