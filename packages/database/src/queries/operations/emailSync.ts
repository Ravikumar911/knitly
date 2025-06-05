import { db } from '../../index';
import { emailSyncStatus } from '../../schema/emailSyncStatus';
import { parsedEmails } from '../../schema/parsedEmails';
import { eq, count } from 'drizzle-orm';

interface SyncStatus {
  lastSyncedAt: Date | null;
  nextPageToken: string | null;
  syncStatus: string | null;
  errorDetails: string | null;
}

interface SyncProgress {
  totalEmails: number | null;
  processedEmails: number;
  progressPercentage: number;
  estimatedCompletion: Date | null;
  syncStatus: string | null;
  hasInitialSync: boolean;
}

/**
 * Gets the sync status for a user
 */
export async function getSyncStatus(userId: string): Promise<SyncStatus> {
  const result = await db.select({
    lastSyncedAt: emailSyncStatus.lastSyncedAt,
    nextPageToken: emailSyncStatus.nextPageToken,
    syncStatus: emailSyncStatus.syncStatus,
    errorDetails: emailSyncStatus.errorDetails
  })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);
  
  if (result.length === 0) {
    return {
      lastSyncedAt: null,
      nextPageToken: null,
      syncStatus: null,
      errorDetails: null
    };
  }

  return {
    lastSyncedAt: result[0]?.lastSyncedAt || null,
    nextPageToken: result[0]?.nextPageToken || null,
    syncStatus: result[0]?.syncStatus || null,
    errorDetails: result[0]?.errorDetails || null
  };
}

/**
 * Check if user has any synced email data
 */
export async function checkUserHasData(userId: string): Promise<{
  hasEmails: boolean;
  hasInitialSync: boolean;
  emailCount: number;
}> {
  // Check if user has any parsed emails
  const emailCountResult = await db.select({ count: count() })
    .from(parsedEmails)
    .where(eq(parsedEmails.userId, userId));
  
  const emailCount = emailCountResult[0]?.count || 0;
  
  // Check sync status
  const syncResult = await db.select({
    hasInitialSync: emailSyncStatus.hasInitialSync
  })
    .from(emailSyncStatus)
    .where(eq(emailSyncStatus.userId, userId))
    .limit(1);
  
  return {
    hasEmails: emailCount > 0,
    hasInitialSync: syncResult[0]?.hasInitialSync || false,
    emailCount
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
    hasInitialSync: emailSyncStatus.hasInitialSync
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
      hasInitialSync: false
    };
  }

  const data = result[0]!; // Safe to use ! here since we checked length > 0
  return {
    totalEmails: data.totalEmails,
    processedEmails: data.processedEmails || 0,
    progressPercentage: parseFloat(data.progressPercentage || '0'),
    estimatedCompletion: data.estimatedCompletion,
    syncStatus: data.syncStatus,
    hasInitialSync: data.hasInitialSync || false
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
  estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + Math.ceil(totalEmails / 1000)); // ~1000 emails per minute

  if (existing.length > 0) {
    await db.update(emailSyncStatus)
      .set({
        totalEmails,
        processedEmails: 0,
        progressPercentage: '0.00',
        estimatedCompletion,
        syncStatus: 'counting_emails',
        updatedAt: new Date()
      })
      .where(eq(emailSyncStatus.userId, userId));
  } else {
    await db.insert(emailSyncStatus)
      .values({
        userId,
        lastSyncedAt: new Date(),
        totalEmails,
        processedEmails: 0,
        progressPercentage: '0.00',
        estimatedCompletion,
        syncStatus: 'counting_emails',
        hasInitialSync: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
}

/**
 * Update sync progress during email processing
 */
export async function updateSyncProgress(userId: string, processedEmails: number): Promise<void> {
  const current = await getSyncProgress(userId);
  
  if (!current.totalEmails) {
    throw new Error('Cannot update progress without total email count');
  }

  const progressPercentage = (processedEmails / current.totalEmails) * 100;
  const remainingEmails = current.totalEmails - processedEmails;
  const estimatedMinutesRemaining = Math.ceil(remainingEmails / 1000); // ~1000 emails per minute
  
  const estimatedCompletion = new Date();
  estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + estimatedMinutesRemaining);

  await db.update(emailSyncStatus)
    .set({
      processedEmails,
      progressPercentage: progressPercentage.toFixed(2),
      estimatedCompletion,
      syncStatus: processedEmails >= current.totalEmails ? 'complete' : 'syncing',
      hasInitialSync: processedEmails >= current.totalEmails ? true : current.hasInitialSync,
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
    // Ensure lastSyncedAt is set for new records
    if (!updateData.lastSyncedAt) {
      updateData.lastSyncedAt = new Date();
    }

    // Make sure all required fields are set
    return await db.insert(emailSyncStatus)
      .values({
        userId,
        lastSyncedAt: updateData.lastSyncedAt,
        nextPageToken: updateData.nextPageToken || null,
        syncStatus: updateData.syncStatus || 'complete',
        errorDetails: updateData.errorDetails || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
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
  return updateSyncStatus(userId, {
    syncStatus: 'in_progress',
    nextPageToken: nextPageToken || null
  });
}

/**
 * Marks a sync as failed
 */
export async function markSyncFailed(userId: string, errorDetails?: string) {
  return updateSyncStatus(userId, {
    syncStatus: 'failed',
    errorDetails: errorDetails || null
  });
}

/**
 * Mark sync as counting emails
 */
export async function markSyncCountingEmails(userId: string): Promise<void> {
  await db.update(emailSyncStatus)
    .set({ 
      syncStatus: 'counting_emails',
      lastSyncedAt: new Date()
    })
    .where(eq(emailSyncStatus.userId, userId));
} 