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
  } else if (hasInitialSync && emailCount > 0) {
    // User has successfully synced data
    userState = 'has_data';
  } else {
    // Fallback for edge cases - treat as new user
    userState = 'new_user';
  }
  
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
 * Initialize sync with total email count
 */
export async function initializeSync(userId: string, totalEmails: number): Promise<void> {
  const existing = await db.select({ id: emailSyncStatus.id })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);

  const estimatedCompletion = new Date();
  // ~35 emails per minute based on observed performance (20 emails taking 3 minutes)
  estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + Math.ceil(totalEmails / 35));

  if (existing.length > 0) {
    await db.update(emailSyncStatus)
      .set({
        totalEmails,
        processedEmails: 0,
        progressPercentage: '0.00',
        estimatedCompletion,
        syncStatus: 'syncing', // Changed to syncing since we're about to start processing
        lastSyncAttemptAt: new Date(), // Track attempt, not successful sync
        updatedAt: new Date()
      })
      .where(eq(emailSyncStatus.userId, userId));
  } else {
    await db.insert(emailSyncStatus)
      .values({
        userId,
        lastSyncAttemptAt: new Date(), // Track attempt, not successful sync
        totalEmails,
        processedEmails: 0,
        progressPercentage: '0.00',
        estimatedCompletion,
        syncStatus: 'syncing', // Changed to syncing since we're about to start processing
        hasInitialSync: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
}

/**
 * Update sync progress during email processing
 */
export async function updateSyncProgress(userId: string, incrementBy: number): Promise<void> {
  // Perform an atomic, race-safe increment and recompute progress using SQL expressions
  await db.update(emailSyncStatus)
    .set({
      // Compute new processed count with cap at totalEmails
      processedEmails: sql`LEAST(${emailSyncStatus.processedEmails} + ${incrementBy}, COALESCE(${emailSyncStatus.totalEmails}, ${emailSyncStatus.processedEmails} + ${incrementBy}))`,
      progressPercentage: sql`CASE
        WHEN COALESCE(${emailSyncStatus.totalEmails}, 0) = 0 THEN '0.00'
        ELSE ROUND(((LEAST(${emailSyncStatus.processedEmails} + ${incrementBy}, COALESCE(${emailSyncStatus.totalEmails}, ${emailSyncStatus.processedEmails} + ${incrementBy}))::numeric) / NULLIF(${emailSyncStatus.totalEmails}::numeric, 0)) * 100, 2)
      END`,
      estimatedCompletion: sql`CASE 
        WHEN COALESCE(${emailSyncStatus.totalEmails}, 0) = 0 THEN ${emailSyncStatus.estimatedCompletion}
        ELSE NOW() + make_interval(mins => CEIL((COALESCE(${emailSyncStatus.totalEmails}, 0) - LEAST(${emailSyncStatus.processedEmails} + ${incrementBy}, COALESCE(${emailSyncStatus.totalEmails}, ${emailSyncStatus.processedEmails} + ${incrementBy}))) / 35.0))
      END`,
      syncStatus: sql`CASE 
        WHEN COALESCE(${emailSyncStatus.totalEmails}, 0) > 0 AND LEAST(${emailSyncStatus.processedEmails} + ${incrementBy}, COALESCE(${emailSyncStatus.totalEmails}, ${emailSyncStatus.processedEmails} + ${incrementBy})) >= ${emailSyncStatus.totalEmails} THEN 'complete' 
        ELSE 'syncing' 
      END`,
      hasInitialSync: sql`CASE 
        WHEN COALESCE(${emailSyncStatus.totalEmails}, 0) > 0 AND LEAST(${emailSyncStatus.processedEmails} + ${incrementBy}, COALESCE(${emailSyncStatus.totalEmails}, ${emailSyncStatus.processedEmails} + ${incrementBy})) >= ${emailSyncStatus.totalEmails} THEN true 
        ELSE ${emailSyncStatus.hasInitialSync} 
      END`,
      updatedAt: new Date()
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