import { db } from '../../index';
import { emailSyncStatus } from '../../schema/emailSyncStatus';
import { parsedEmails } from '../../schema/parsedEmails';
import { eq, count, and, or, isNotNull, isNull, lt, not, inArray, sql } from 'drizzle-orm';
import { userGoogleTokens } from '../../schema/tokens';

interface SyncStatus {
  lastSyncedAt: Date | null;
  lastSyncAttemptAt: Date | null;
  nextPageToken: string | null;
  syncStatus: string | null;
  errorDetails: string | null;
  // OAuth error fields
  oauthErrorType: string | null;
  oauthErrorCode: string | null;
  requiresReauth: boolean;
  userFriendlyError: string | null;
}

interface SyncProgress {
  totalEmails: number | null;
  processedEmails: number;
  progressPercentage: number;
  estimatedCompletion: Date | null;
  syncStatus: string | null;
  hasInitialSync: boolean;
  // OAuth error fields
  oauthErrorType: string | null;
  oauthErrorCode: string | null;
  requiresReauth: boolean;
  userFriendlyError: string | null;
}

export type UnifiedEmailSyncState = {
  state: 'new_user' | 'oauth_error' | 'sync_failed' | 'sync_in_progress' | 'has_data';
  phase: 'idle' | 'counting_emails' | 'in_progress' | 'syncing' | 'complete' | 'failed' | 'stalled';
  progress: { total: number | null; processed: number; percent: number; eta: Date | null };
  oauth: { type: string | null; code: string | null; requiresReauth: boolean; userFriendlyMessage: string | null } | null;
  hasInitialSync: boolean;
  needsAction: boolean;
  action: 'reauth' | 'retry' | null;
};

// OAuth Error type to match the one from googleAuth.ts
interface OAuthError {
  code: string;
  type: 'INSUFFICIENT_PERMISSIONS' | 'REVOKED_ACCESS' | 'EXPIRED_TOKEN' | 'INVALID_GRANT' | 'OAUTH_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  requiresReauth: boolean;
  userFriendlyMessage: string;
}

/**
 * Gets the sync status for a user
 */
export async function getSyncStatus(userId: string): Promise<SyncStatus> {
  const result = await db.select({
    lastSyncedAt: emailSyncStatus.lastSyncedAt,
    lastSyncAttemptAt: emailSyncStatus.lastSyncAttemptAt,
    nextPageToken: emailSyncStatus.nextPageToken,
    syncStatus: emailSyncStatus.syncStatus,
    errorDetails: emailSyncStatus.errorDetails,
    oauthErrorType: emailSyncStatus.oauthErrorType,
    oauthErrorCode: emailSyncStatus.oauthErrorCode,
    requiresReauth: emailSyncStatus.requiresReauth,
    userFriendlyError: emailSyncStatus.userFriendlyError
  })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);
    
  if (result.length === 0) {
    return {
      lastSyncedAt: null,
      lastSyncAttemptAt: null,
      nextPageToken: null,
      syncStatus: null,
      errorDetails: null,
      oauthErrorType: null,
      oauthErrorCode: null,
      requiresReauth: false,
      userFriendlyError: null
    };
  }

  return {
    lastSyncedAt: result[0]?.lastSyncedAt || null,
    lastSyncAttemptAt: result[0]?.lastSyncAttemptAt || null,
    nextPageToken: result[0]?.nextPageToken || null,
    syncStatus: result[0]?.syncStatus || null,
    errorDetails: result[0]?.errorDetails || null,
    oauthErrorType: result[0]?.oauthErrorType || null,
    oauthErrorCode: result[0]?.oauthErrorCode || null,
    requiresReauth: result[0]?.requiresReauth || false,
    userFriendlyError: result[0]?.userFriendlyError || null
  };
}

/**
 * Check if user has any synced email data with detailed state information
 */
export async function checkUserHasData(userId: string): Promise<{
  hasEmails: boolean;
  hasInitialSync: boolean;
  emailCount: number;
  userState: 'new_user' | 'oauth_error' | 'sync_failed' | 'sync_in_progress' | 'has_data';
  syncStatus: string | null;
  oauthError: {
    type: string | null;
    code: string | null;
    requiresReauth: boolean;
    userFriendlyMessage: string | null;
  } | null;
}> {
  // Check if user has any parsed emails
  const emailCountResult = await db.select({ count: count() })
    .from(parsedEmails)
    .where(eq(parsedEmails.userId, userId));
  
  const emailCount = emailCountResult[0]?.count || 0;
  
  // Check sync status with OAuth error information
  const syncResult = await db.select({
    hasInitialSync: emailSyncStatus.hasInitialSync,
    syncStatus: emailSyncStatus.syncStatus,
    oauthErrorType: emailSyncStatus.oauthErrorType,
    oauthErrorCode: emailSyncStatus.oauthErrorCode,
    requiresReauth: emailSyncStatus.requiresReauth,
    userFriendlyError: emailSyncStatus.userFriendlyError,
    lastSyncAttemptAt: emailSyncStatus.lastSyncAttemptAt
  })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);
  
  const syncData = syncResult[0];
  const hasInitialSync = syncData?.hasInitialSync || false;
  const syncStatus = syncData?.syncStatus || null;
  
  // Determine user state based on data
  let userState: 'new_user' | 'oauth_error' | 'sync_failed' | 'sync_in_progress' | 'has_data';
  
  if (!syncData || !syncData.lastSyncAttemptAt) {
    // User has never attempted sync
    userState = 'new_user';
  } else if (syncData.oauthErrorType && syncData.requiresReauth) {
    // User has OAuth errors requiring reauth
    userState = 'oauth_error';
  } else if (syncStatus === 'failed') {
    // User has failed sync (non-OAuth error)
    userState = 'sync_failed';
  } else if (syncStatus && ['in_progress', 'syncing', 'counting_emails'].includes(syncStatus)) {
    // User has sync in progress
    userState = 'sync_in_progress';
  } else if (hasInitialSync) {
    // User completed an initial sync. Even if no emails were imported (emailCount = 0),
    // treat this as a completed setup so the app can show the dashboard with empty states.
    userState = 'has_data';
   } else {
    userState = 'new_user';
   } 

  console.log("userState", userState);
  
  // Prepare OAuth error information
  const oauthError = syncData?.oauthErrorType ? {
    type: syncData.oauthErrorType,
    code: syncData.oauthErrorCode,
    requiresReauth: syncData.requiresReauth || false,
    userFriendlyMessage: syncData.userFriendlyError
  } : null;
  
  return {
    hasEmails: emailCount > 0,
    hasInitialSync,
    emailCount,
    userState,
    syncStatus,
    oauthError
  };
}

/**
 * Get sync progress information
 */
export async function getSyncProgress(userId: string): Promise<SyncProgress> {
  const result = await db.select({
    totalEmails: emailSyncStatus.totalEmails,
    processedEmails: emailSyncStatus.processedEmails,
    progressPercentage: emailSyncStatus.progressPercentage,
    estimatedCompletion: emailSyncStatus.estimatedCompletion,
    syncStatus: emailSyncStatus.syncStatus,
    hasInitialSync: emailSyncStatus.hasInitialSync,
    oauthErrorType: emailSyncStatus.oauthErrorType,
    oauthErrorCode: emailSyncStatus.oauthErrorCode,
    requiresReauth: emailSyncStatus.requiresReauth,
    userFriendlyError: emailSyncStatus.userFriendlyError
  })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);
  
  if (result.length === 0) {
    return {
      totalEmails: null,
      processedEmails: 0,
      progressPercentage: 0,
      estimatedCompletion: null,
      syncStatus: null,
      hasInitialSync: false,
      oauthErrorType: null,
      oauthErrorCode: null,
      requiresReauth: false,
      userFriendlyError: null
    };
  }

  const data = result[0]!; // Safe to use ! here since we checked length > 0
  return {
    totalEmails: data.totalEmails,
    processedEmails: data.processedEmails || 0,
    progressPercentage: parseFloat(data.progressPercentage || '0'),
    estimatedCompletion: data.estimatedCompletion,
    syncStatus: data.syncStatus,
    hasInitialSync: data.hasInitialSync || false,
    oauthErrorType: data.oauthErrorType,
    oauthErrorCode: data.oauthErrorCode,
    requiresReauth: data.requiresReauth || false,
    userFriendlyError: data.userFriendlyError
  };
}

/**
 * Ensure a status row exists for the user. Idempotent.
 */
export async function ensureSyncRow(userId: string): Promise<void> {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(emailSyncStatus)
      .values({
        userId,
        nextPageToken: null,
        syncStatus: null,
        errorDetails: null,
        processedEmails: 0,
        progressPercentage: '0.00',
        hasInitialSync: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  }
}

/**
 * Unified state computation for frontend. Includes staleness detection.
 */
export async function getUnifiedSyncState(userId: string): Promise<UnifiedEmailSyncState> {
  // Fetch status row
  const statusRows = await db.select({
    lastSyncedAt: emailSyncStatus.lastSyncedAt,
    lastSyncAttemptAt: emailSyncStatus.lastSyncAttemptAt,
    nextPageToken: emailSyncStatus.nextPageToken,
    syncStatus: emailSyncStatus.syncStatus,
    errorDetails: emailSyncStatus.errorDetails,
    oauthErrorType: emailSyncStatus.oauthErrorType,
    oauthErrorCode: emailSyncStatus.oauthErrorCode,
    requiresReauth: emailSyncStatus.requiresReauth,
    userFriendlyError: emailSyncStatus.userFriendlyError,
    totalEmails: emailSyncStatus.totalEmails,
    processedEmails: emailSyncStatus.processedEmails,
    progressPercentage: emailSyncStatus.progressPercentage,
    estimatedCompletion: emailSyncStatus.estimatedCompletion,
    hasInitialSync: emailSyncStatus.hasInitialSync,
    updatedAt: emailSyncStatus.updatedAt,
  })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  const row = statusRows[0];

  // Default when no row exists yet
  if (!row) {
    return {
      state: 'new_user',
      phase: 'idle',
      progress: { total: null, processed: 0, percent: 0, eta: null },
      oauth: null,
      hasInitialSync: false,
      needsAction: false,
      action: null,
    };
  }

  // Determine base phase from syncStatus
  const rawPhase = (row.syncStatus as UnifiedEmailSyncState['phase']) || 'idle';

  // Staleness detection: if active phase and updatedAt is stale -> stalled
  const ACTIVE_PHASES: Array<UnifiedEmailSyncState['phase']> = ['counting_emails', 'in_progress', 'syncing'];
  const STALE_MS = 5 * 60 * 1000; // 5 minutes
  const updatedAt = row.updatedAt ?? row.lastSyncAttemptAt ?? row.lastSyncedAt ?? null;
  const isActive = ACTIVE_PHASES.includes(rawPhase);
  const isStale = isActive && updatedAt ? (Date.now() - updatedAt.getTime()) > STALE_MS : false;
  const phase: UnifiedEmailSyncState['phase'] = isStale ? 'stalled' : rawPhase;

  // Determine high-level state
  let state: UnifiedEmailSyncState['state'];
  if (!row.lastSyncAttemptAt) {
    state = 'new_user';
  } else if (row.oauthErrorType && row.requiresReauth) {
    state = 'oauth_error';
  } else if (row.syncStatus === 'failed') {
    state = 'sync_failed';
  } else if (['in_progress', 'syncing', 'counting_emails'].includes(row.syncStatus || '')) {
    state = 'sync_in_progress';
  } else if (row.hasInitialSync) {
    state = 'has_data';
  } else {
    state = 'new_user';
  }

  // Progress
  const total = row.totalEmails ?? null;
  const processed = row.processedEmails || 0;
  const percent = parseFloat(row.progressPercentage || '0');
  const eta = row.estimatedCompletion ?? null;

  // OAuth
  const oauth = row.oauthErrorType ? {
    type: row.oauthErrorType,
    code: row.oauthErrorCode,
    requiresReauth: row.requiresReauth || false,
    userFriendlyMessage: row.userFriendlyError || null,
  } : null;

  // Action recommendation
  let action: UnifiedEmailSyncState['action'] = null;
  let needsAction = false;
  if (oauth?.requiresReauth) {
    action = 'reauth';
    needsAction = true;
  } else if (phase === 'failed' || phase === 'stalled') {
    action = 'retry';
    needsAction = true;
  }

  return {
    state,
    phase,
    progress: { total, processed, percent, eta },
    oauth,
    hasInitialSync: row.hasInitialSync || false,
    needsAction,
    action,
  };
}

/**
 * Initialize sync with total email count
 */
export async function initializeSync(userId: string, totalEmails: number): Promise<void> {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  // We no longer try to "guess" the estimated completion time here.
  // Instead we set it to null and let `updateSyncProgress` calculate
  // a dynamic estimate once we have real processing data.
  const initialData = {
    totalEmails,
    processedEmails: 0,
    progressPercentage: '0.00',
    estimatedCompletion: null as Date | null,
    syncStatus: 'syncing' as const, // about to start processing
    lastSyncAttemptAt: new Date(), // Track attempt, not successful sync
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(emailSyncStatus)
      .set(initialData)
      .where(eq(emailSyncStatus.userId, userId));
  } else {
    await db.insert(emailSyncStatus)
      .values({
        userId,
        hasInitialSync: false,
        createdAt: new Date(),
        ...initialData,
      });
  }
}

/**
 * Update sync progress during email processing
 */
export async function updateSyncProgress(userId: string, incrementBy: number): Promise<void> {
  // Fetch current status so we can compute a dynamic ETA based on real throughput
  const currentStatus = await db.select({
    processedEmails: emailSyncStatus.processedEmails,
    totalEmails: emailSyncStatus.totalEmails,
    lastSyncAttemptAt: emailSyncStatus.lastSyncAttemptAt,
    createdAt: emailSyncStatus.createdAt,
    estimatedCompletion: emailSyncStatus.estimatedCompletion,
    hasInitialSync: emailSyncStatus.hasInitialSync,
  })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  if (currentStatus.length === 0) {
    // No status row yet – initialise to avoid inconsistent state
    await initializeSync(userId, 0);
    return;
  }

  const status = currentStatus[0]!;

  const newProcessed = Math.min(
    (status.processedEmails || 0) + incrementBy,
    status.totalEmails ?? (status.processedEmails || 0) + incrementBy,
  );

  let estimatedCompletion: Date | null = status.estimatedCompletion ?? null;

// We'll calculate ETA only if we know the total email count and haven't completed yet
  if (status.totalEmails && status.totalEmails > 0 && newProcessed < status.totalEmails) {
    const startTime = status.lastSyncAttemptAt ?? status.createdAt ?? new Date();
    const elapsedMs = Date.now() - startTime.getTime();
    if (elapsedMs > 0) {
      const emailsPerMs = newProcessed / elapsedMs;
      if (emailsPerMs > 0) {
        const remainingEmails = status.totalEmails - newProcessed;
        const remainingMs = remainingEmails / emailsPerMs;
        estimatedCompletion = new Date(Date.now() + remainingMs);
      }
    }
  } else if (status.totalEmails && newProcessed >= status.totalEmails) {
    // If we've reached or exceeded total, set ETA = now
    estimatedCompletion = new Date();
  }

  // Perform the update
  await db.update(emailSyncStatus)
    .set({
      processedEmails: newProcessed,
      progressPercentage: status.totalEmails && status.totalEmails > 0
        ? ((newProcessed / status.totalEmails) * 100).toFixed(2)
        : '0.00',
      estimatedCompletion,
      syncStatus: status.totalEmails && newProcessed >= status.totalEmails ? 'complete' : 'syncing',
      hasInitialSync: status.totalEmails && newProcessed >= status.totalEmails ? true : status.hasInitialSync,
      updatedAt: new Date(),
    })
    .where(eq(emailSyncStatus.userId, userId));
}

/**
 * Gets the last sync timestamp for a user
 */
export async function getLastSyncTime(userId: string): Promise<Date | null> {
  const status = await getSyncStatus(userId);
  return status.lastSyncedAt;
}

/**
 * Gets the next page token for a user's sync
 */
export async function getNextPageToken(userId: string): Promise<string | null> {
  const status = await getSyncStatus(userId);
  return status.nextPageToken;
}

/**
 * Updates the sync status for a user
 */
export async function updateSyncStatus(userId: string, data: {
  syncTime?: Date;
  nextPageToken?: string | null;
  syncStatus?: string;
  errorDetails?: string | null;
}) {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  const updateData: any = {
    updatedAt: new Date()
  };

  if (data.syncTime) {
    updateData.lastSyncedAt = data.syncTime;
  }

  if (data.nextPageToken !== undefined) {
    updateData.nextPageToken = data.nextPageToken;
  }

  if (data.syncStatus) {
    updateData.syncStatus = data.syncStatus;
  }

  if (data.errorDetails !== undefined) {
    updateData.errorDetails = data.errorDetails;
  }

  if (existing.length > 0) {
    return await db.update(emailSyncStatus)
      .set(updateData)
      .where(eq(emailSyncStatus.userId, userId))
      .returning();
  } else {
    // Only set lastSyncedAt if explicitly provided via syncTime
    const insertData: any = {
      userId,
      nextPageToken: updateData.nextPageToken || null,
      syncStatus: updateData.syncStatus || 'complete',
      errorDetails: updateData.errorDetails || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only set lastSyncedAt if syncTime was provided
    if (data.syncTime) {
      insertData.lastSyncedAt = data.syncTime;
    }

    return await db.insert(emailSyncStatus)
      .values(insertData)
      .returning();
  }
}

/**
 * Updates the last sync timestamp for a user
 */
export async function updateLastSyncTime(userId: string, syncTime: Date) {
  return updateSyncStatus(userId, { syncTime });
}

/**
 * Updates the next page token for a user
 */
export async function updateNextPageToken(userId: string, nextPageToken: string | null) {
  return updateSyncStatus(userId, { nextPageToken });
}

/**
 * Marks a sync as complete by clearing the next page token
 */
export async function markSyncComplete(userId: string) {
  return updateSyncStatus(userId, {
    nextPageToken: null,
    syncStatus: 'complete',
    syncTime: new Date()
  });
}

/**
 * Marks a sync as in progress
 */
export async function markSyncInProgress(userId: string, nextPageToken?: string) {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return updateSyncStatus(userId, {
      syncStatus: 'in_progress',
      nextPageToken: nextPageToken || null
    });
  } else {
    await db.insert(emailSyncStatus)
      .values({
        userId,
        lastSyncAttemptAt: new Date(), // Track attempt, not successful sync
        syncStatus: 'in_progress',
        nextPageToken: nextPageToken || null,
        hasInitialSync: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
}

/**
 * Marks a sync as failed
 */
export async function markSyncFailed(userId: string, errorDetails?: string) {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return await db.update(emailSyncStatus)
      .set({
        syncStatus: 'failed',
        errorDetails: errorDetails || null,
        lastSyncAttemptAt: new Date(), // Track attempt time
        updatedAt: new Date()
      })
      .where(eq(emailSyncStatus.userId, userId))
      .returning();
  } else {
    return await db.insert(emailSyncStatus)
      .values({
        userId,
        lastSyncAttemptAt: new Date(), // Track attempt time
        syncStatus: 'failed',
        errorDetails: errorDetails || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
  }
}

/**
 * Mark sync as counting emails
 */
export async function markSyncCountingEmails(userId: string): Promise<void> {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(emailSyncStatus)
      .set({ 
        syncStatus: 'counting_emails',
        lastSyncAttemptAt: new Date(), // Track attempt, not successful sync
        updatedAt: new Date()
      })
      .where(eq(emailSyncStatus.userId, userId));
  } else {
    await db.insert(emailSyncStatus)
      .values({
        userId,
        lastSyncAttemptAt: new Date(), // Track attempt, not successful sync
        syncStatus: 'counting_emails',
        hasInitialSync: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
}

/**
 * Get all users who need email syncing
 * Returns users with Google tokens who haven't synced in the last 24 hours
 */
export async function getUsersNeedingSync(): Promise<Array<{
  userId: string;
  lastSyncedAt: Date | null;
}>> {
  // Get users with Google tokens who either:
  // 1. Have never synced (no record in emailSyncStatus)
  // 2. Haven't synced in the last 24 hours
  // 3. Have a sync status that's not 'in_progress' or 'syncing' (to avoid double syncing)
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const usersWithTokens = await db
    .select({
      userId: userGoogleTokens.userId,
      lastSyncedAt: emailSyncStatus.lastSyncedAt,
      syncStatus: emailSyncStatus.syncStatus,
    })
    .from(userGoogleTokens)
    .leftJoin(emailSyncStatus, eq(userGoogleTokens.userId, emailSyncStatus.userId))
    .where(
      and(
        // Has valid refresh token
        isNotNull(userGoogleTokens.providerRefreshToken),
        // Either never synced, synced more than 24 hours ago, or not currently syncing
        or(
          // Never synced (no emailSyncStatus record)
          isNull(emailSyncStatus.userId),
          // Synced more than 24 hours ago
          and(
            isNotNull(emailSyncStatus.lastSyncedAt),
            lt(emailSyncStatus.lastSyncedAt, twentyFourHoursAgo)
          ),
          // Failed sync that needs retry
          eq(emailSyncStatus.syncStatus, 'failed')
        ),
        // Not currently syncing
        or(
          isNull(emailSyncStatus.syncStatus),
          not(inArray(emailSyncStatus.syncStatus, ['in_progress', 'syncing', 'counting_emails']))
        )
      )
    );

  return usersWithTokens.map(user => ({
    userId: user.userId,
    lastSyncedAt: user.lastSyncedAt,
  }));
}

/**
 * Mark sync as failed with OAuth error details
 */
export async function markSyncFailedWithOAuthError(
  userId: string,
  oauthError: OAuthError
): Promise<void> {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  const updateData = {
    syncStatus: 'failed',
    errorDetails: oauthError.message,
    oauthErrorType: oauthError.type,
    oauthErrorCode: oauthError.code,
    requiresReauth: oauthError.requiresReauth,
    userFriendlyError: oauthError.userFriendlyMessage,
    lastSyncAttemptAt: new Date(), // Track attempt, not successful sync
    updatedAt: new Date()
  };

  if (existing.length > 0) {
    await db.update(emailSyncStatus)
      .set(updateData)
      .where(eq(emailSyncStatus.userId, userId));
  } else {
    await db.insert(emailSyncStatus)
      .values({
        userId,
        ...updateData,
        createdAt: new Date()
      });
  }
}

/**
 * Clear OAuth errors when sync succeeds or user takes corrective action
 * Only clears errors if the sync status indicates success
 */
export async function clearOAuthErrors(userId: string): Promise<void> {
  // First check if we should clear errors - only clear if sync is completing successfully
  const currentStatus = await getSyncStatus(userId);
  
  // Don't clear OAuth errors if sync is still in progress or failed
  // This prevents race conditions where errors get cleared prematurely
  if (currentStatus.syncStatus && 
      ['in_progress', 'syncing', 'counting_emails', 'failed'].includes(currentStatus.syncStatus)) {
    console.log(`Not clearing OAuth errors for user ${userId} - sync status is ${currentStatus.syncStatus}`);
    return;
  }

  await db.update(emailSyncStatus)
    .set({
      oauthErrorType: null,
      oauthErrorCode: null,
      requiresReauth: false,
      userFriendlyError: null,
      updatedAt: new Date()
    })
    .where(eq(emailSyncStatus.userId, userId));
}

/**
 * Force clear OAuth errors when user takes corrective action (like re-authentication)
 * This bypasses the status check and always clears errors
 */
export async function forceClearOAuthErrors(userId: string): Promise<void> {
  await db.update(emailSyncStatus)
    .set({
      oauthErrorType: null,
      oauthErrorCode: null,
      requiresReauth: false,
      userFriendlyError: null,
      updatedAt: new Date()
    })
    .where(eq(emailSyncStatus.userId, userId));
} 

/**
 * Reset sync status following a successful OAuth reauthentication.
 * This clears failure state so UI doesn't remain stuck on "failed".
 */
export async function resetSyncStatusAfterReauth(userId: string): Promise<void> {
  await db.update(emailSyncStatus)
    .set({
      syncStatus: null,
      errorDetails: null,
      updatedAt: new Date(),
    })
    .where(eq(emailSyncStatus.userId, userId));
}