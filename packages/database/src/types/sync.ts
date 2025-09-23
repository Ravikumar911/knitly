// Centralized sync types and UI message builder used by BE and FE

export type EmailSyncPhase =
  | 'counting_emails'
  | 'in_progress'
  | 'syncing'
  | 'complete'
  | 'failed';

export const EMAIL_SYNC_PHASES: ReadonlyArray<EmailSyncPhase> = [
  'counting_emails',
  'in_progress',
  'syncing',
  'complete',
  'failed',
];

export interface OAuthErrorInfo {
  type: string | null;
  code: string | null;
  requiresReauth: boolean;
  userFriendlyMessage: string | null;
}

export interface SyncUIMessage {
  title: string;
  description: string;
  progressText?: string;
}

export interface SyncMessageInput {
  syncStatus: EmailSyncPhase | null;
  processedEmails: number;
  totalEmails: number | null;
  oauthErrorType: string | null;
  userFriendlyError: string | null;
}

export function buildSyncUIMessage(input: SyncMessageInput): SyncUIMessage {
  // OAuth errors take precedence over generic sync messages
  if (input.oauthErrorType) {
    const permissionTypes = new Set(['INSUFFICIENT_PERMISSIONS', 'REVOKED_ACCESS']);
    const isPermissionIssue = permissionTypes.has(input.oauthErrorType);
    return {
      title: isPermissionIssue ? 'Gmail Permission Required' : 'Authentication Issue',
      description: input.userFriendlyError || 'There is a problem with your Google account connection.',
      progressText: undefined,
    };
  }

  // Default fallback
  if (!input.syncStatus) {
    return {
      title: 'Email Sync',
      description: 'No sync in progress.',
    };
  }

  const withProgress = (title: string, baseDescription: string): SyncUIMessage => {
    const hasTotals = typeof input.totalEmails === 'number' && input.totalEmails > 0;
    const progressText = hasTotals
      ? `${Math.max(0, input.processedEmails)} of ${input.totalEmails} emails processed`
      : `${Math.max(0, input.processedEmails)} emails processed`;
    return { title, description: baseDescription, progressText };
  };

  switch (input.syncStatus) {
    case 'counting_emails':
      return {
        title: 'Analyzing Your Gmail',
        description: 'We are counting your emails to estimate processing time.',
      };
    case 'in_progress':
      return {
        title: 'Preparing to Process',
        description: 'Getting everything ready to process your emails.',
      };
    case 'syncing':
      return withProgress(
        'Processing Your Emails',
        'Analyzing your emails for transaction data.'
      );
    case 'complete':
      return {
        title: 'Sync Complete!',
        description: 'Your emails have been successfully analyzed and imported.',
      };
    case 'failed':
      return {
        title: 'Sync Failed',
        description: 'Something went wrong during the sync process. Please try again.',
      };
    default:
      return {
        title: 'Sync Status',
        description: 'Sync status is unknown.',
      };
  }
}

