# Email Sync Status Logic Analysis - Issues & Recommendations

## Executive Summary
After comprehensive analysis of the email sync status logic across Frontend (FE), Backend (BE), and Trigger.dev, I've identified **10 critical issues** where users can get stuck in loading, error, or retry states. This document outlines each issue with specific code references and recommended fixes.

---

## 🔴 CRITICAL ISSUES

### 1. **Staleness Detection Fails During Email Counting Phase**

**Location**: `packages/tasks/src/trigger/processEmails.ts` (lines 306-417)

**Issue**: 
- After calling `markSyncInProgress()` at line 306, the task fetches Gmail messages in a loop (lines 320-414)
- During this counting phase, `updatedAt` is **never updated** in the database
- If counting takes > 5 minutes (common for accounts with 10k+ emails), the staleness check in `getUnifiedSyncState()` triggers
- Frontend shows "Stalled" state even though backend is actively working

```typescript
// Line 306: Last update before counting
await markSyncInProgress(payload.userId);

// Lines 320-414: Long-running loop with NO status updates
while (true) {
  pageCount++;
  // ... fetch messages (can take 5+ minutes)
  // ❌ NO updatedAt update during this entire phase
}

// Line 417: Next update only AFTER counting completes
await markSyncCountingEmails(payload.userId);
```

**Symptoms**:
- User sees "Analyzing mailbox" for a few minutes
- Status changes to "Stalled" while backend is still fetching
- User clicks "Retry" which triggers duplicate sync

**Recommended Fix**:
```typescript
// Update status periodically during counting
while (true) {
  pageCount++;
  
  // Update status every 10 pages or 2 minutes
  if (pageCount % 10 === 0) {
    await db.update(emailSyncStatus)
      .set({ updatedAt: new Date() })
      .where(eq(emailSyncStatus.userId, payload.userId));
  }
  
  const gmailData = await fetchGmailMessages(/*...*/);
  // ... rest of logic
}
```

---

### 2. **Race Condition: Multiple Syncs Can Start Simultaneously**

**Location**: `apps/main/trpc/routers/emails.ts` (lines 58-66)

**Issue**:
- The idempotency guard checks if sync is already in progress
- However, it **excludes 'stalled'** from active phases
- If two users/tabs call `initiateSync` simultaneously when status is 'stalled', both will pass the guard
- Trigger.dev will launch two parallel sync jobs for the same user

```typescript
// Line 59-61: Idempotency guard
const activePhases = ['counting_emails', 'in_progress', 'syncing'] as const;
if (activePhases.includes(unified.phase as any) && unified.phase !== 'stalled') {
  return { success: true, message: "Email sync already in progress." };
}

// ❌ Problem: 'stalled' and 'failed' phases are NOT protected
// If phase === 'stalled', both calls proceed to line 72
await processEmails.trigger({ userId: ctx.userId! });
```

**Symptoms**:
- User clicks "Retry" after stalled state
- Two Trigger.dev jobs start processing same emails
- Database race conditions on `updateSyncProgress`
- Incorrect progress percentages (e.g., "150% complete")

**Recommended Fix**:
```typescript
// Add atomic lock using database
const updateResult = await db.update(emailSyncStatus)
  .set({ 
    syncStatus: 'in_progress',
    updatedAt: new Date() 
  })
  .where(
    and(
      eq(emailSyncStatus.userId, ctx.userId!),
      // Only update if NOT already in active state
      not(inArray(emailSyncStatus.syncStatus, ['counting_emails', 'in_progress', 'syncing']))
    )
  )
  .returning();

if (updateResult.length === 0) {
  return { success: true, message: "Email sync already in progress." };
}

// Now safe to trigger
await processEmails.trigger({ userId: ctx.userId! });
```

---

### 3. **OAuth Error State Doesn't Clear After Successful Reauth**

**Location**: `apps/main/app/auth/callback/route.ts` (lines 36-43) and `packages/database/src/queries/operations/emailSync.ts` (lines 793-801)

**Issue**:
- After reauth, `forceClearOAuthErrors()` clears OAuth fields
- Then `resetSyncStatusAfterReauth()` sets `syncStatus: null`
- However, if user had `totalEmails` and `processedEmails` from failed sync, those remain
- Frontend sees phase='idle' but still shows old progress: "Processing 250/1000 emails"

```typescript
// auth/callback/route.ts - Line 37-38
await forceClearOAuthErrors(user.id);
await resetSyncStatusAfterReauth(user.id);

// emailSync.ts - Line 793-801
export async function resetSyncStatusAfterReauth(userId: string): Promise<void> {
  await db.update(emailSyncStatus)
    .set({
      syncStatus: null,
      errorDetails: null,
      updatedAt: new Date(),
      // ❌ Doesn't clear: totalEmails, processedEmails, progressPercentage
    })
    .where(eq(emailSyncStatus.userId, userId));
}
```

**Symptoms**:
- User hits OAuth error mid-sync (e.g., 250/1000 emails processed)
- User clicks "Reconnect Google" and re-authorizes
- Frontend shows "Ready to start" but still displays "250/1000 emails processed"
- Confusing mixed state

**Recommended Fix**:
```typescript
export async function resetSyncStatusAfterReauth(userId: string): Promise<void> {
  await db.update(emailSyncStatus)
    .set({
      syncStatus: null,
      errorDetails: null,
      // Clear progress tracking
      totalEmails: null,
      processedEmails: 0,
      progressPercentage: '0.00',
      estimatedCompletion: null,
      updatedAt: new Date(),
    })
    .where(eq(emailSyncStatus.userId, userId));
}
```

---

### 4. **Frontend Polling Never Stops on Network Errors**

**Location**: `apps/main/hooks/useEmailSync.ts` (lines 25-33)

**Issue**:
- The `refetchInterval` function only checks `state.phase` to determine if polling should continue
- If the tRPC query fails with a network error, React Query returns the last successful `data`
- The phase remains in active state (e.g., 'syncing'), so polling continues forever
- User sees infinite loading spinner even when backend is unreachable

```typescript
// Line 25-33: Refetch logic
const { data, refetch, isFetching, isLoading, error } = useQuery({
  ...queryOptions,
  refetchInterval: (q) => {
    const s = q.state.data as UnifiedState | undefined;
    return computeRefetchInterval(s); // ❌ Ignores query error state
  },
  staleTime: 0,
  refetchOnWindowFocus: true,
});

// Line 10-17: computeRefetchInterval
function computeRefetchInterval(state?: UnifiedState): number | false {
  if (!state) return false;
  const active = ['counting_emails', 'in_progress', 'syncing', 'stalled'] as const;
  if (active.includes(state.phase as any)) {
    return state.phase === 'stalled' ? 4000 : 1500;
  }
  return false; // ❌ No check for network/API errors
}
```

**Symptoms**:
- Backend goes down or network disconnects during sync
- Frontend continues polling every 1.5 seconds
- User stuck on loading screen
- Error message might flash but polling never stops

**Recommended Fix**:
```typescript
// Update refetchInterval to check error state
refetchInterval: (q) => {
  // Stop polling if there's a query error
  if (q.state.error) {
    return false;
  }
  
  const s = q.state.data as UnifiedState | undefined;
  return computeRefetchInterval(s);
},

// Add retry limits
retry: (failureCount, error) => {
  // Stop retrying after 3 consecutive failures
  if (failureCount >= 3) return false;
  return true;
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
```

---

### 5. **Progress Updates Can Fail Silently in Parallel Batches**

**Location**: `packages/tasks/src/trigger/processEmailBatch.ts` (lines 208-218)

**Issue**:
- Multiple email batches run in parallel (up to 5 concurrent batches)
- Each batch calls `updateSyncProgress(userId, 1)` after processing each email
- If two batches try to increment simultaneously, database race condition occurs
- Failed updates are logged but don't retry
- Frontend sees progress "stuck" (e.g., stays at 45% for 10 minutes)

```typescript
// Line 208-218: Progress update in finally block
} finally {
  try {
    await updateSyncProgress(payload.userId, 1);
  } catch (e) {
    logger.error("Failed to increment sync progress", {
      userId: payload.userId,
      messageId: messageInfo.id,
      error: e instanceof Error ? e.message : String(e)
    });
    // ❌ No retry, no fallback - just continues
  }
}
```

**Symptoms**:
- Progress bar moves smoothly at first
- Gets stuck at random percentage (e.g., 45%)
- Stays stuck for several minutes
- Eventually completes but shows wrong final count
- Staleness detection triggers if stuck for 5+ minutes

**Recommended Fix**:
```typescript
// Option 1: Add retry logic
} finally {
  let retries = 3;
  while (retries > 0) {
    try {
      await updateSyncProgress(payload.userId, 1);
      break; // Success
    } catch (e) {
      retries--;
      if (retries === 0) {
        logger.error("Failed to increment sync progress after retries", {
          userId: payload.userId,
          messageId: messageInfo.id,
          error: e instanceof Error ? e.message : String(e)
        });
      } else {
        await wait.for({ seconds: 0.5 }); // Brief backoff
      }
    }
  }
}

// Option 2: Use optimistic concurrency control
export async function updateSyncProgress(userId: string, incrementBy: number): Promise<void> {
  // Use SQL with row-level locking
  await db.execute(sql`
    UPDATE email_sync_status 
    SET 
      processed_emails = processed_emails + ${incrementBy},
      updated_at = NOW()
    WHERE user_id = ${userId}
    FOR UPDATE SKIP LOCKED
  `);
}
```

---

### 6. **'complete' State Requires Manual Reload to Show Dashboard**

**Location**: `apps/main/components/common/SyncInitiator.tsx` (lines 111-124)

**Issue**:
- When sync completes, UI shows "View Dashboard" button that calls `window.location.reload()`
- `DataStatusRouter` should automatically show dashboard when `state.state === 'has_data'`
- However, React Query cache might be stale
- User must manually click reload button

```typescript
// Line 111-124: Complete state UI
{isComplete && (
  <div className="text-center space-y-4">
    <p className="text-green-600">
      🎉 Analysis complete! You can now explore your financial insights.
    </p>
    <Button 
      onClick={() => window.location.reload()} // ❌ Manual reload required
      size="lg"
      className="w-full"
    >
      View Dashboard
    </Button>
  </div>
)}
```

**Symptoms**:
- Sync completes successfully
- User sees success message and button
- Must manually click button to proceed
- Poor UX - should auto-navigate

**Recommended Fix**:
```typescript
// Option 1: Auto-navigate on complete
import { useRouter } from 'next/navigation';

export function SyncInitiator() {
  const router = useRouter();
  const { state, isLoading, statusLabel, statusDescription, cta } = useEmailSync();

  useEffect(() => {
    // Auto-navigate when sync completes
    if (state?.phase === 'complete' && state?.state === 'has_data') {
      setTimeout(() => {
        router.refresh(); // Server-side refetch
        router.push('/dashboard'); // Navigate
      }, 2000); // 2 second delay to show success message
    }
  }, [state?.phase, state?.state, router]);

  // ... rest of component
}

// Option 2: Invalidate query on complete
const queryClient = useQueryClient();

useEffect(() => {
  if (state?.phase === 'complete') {
    // Force refetch of data status
    queryClient.invalidateQueries({ queryKey: ['emails', 'checkDataExists'] });
  }
}, [state?.phase, queryClient]);
```

---

### 7. **Failed Sync Doesn't Reset Progress Tracking**

**Location**: `packages/database/src/queries/operations/emailSync.ts` (lines 596-624)

**Issue**:
- `markSyncFailed()` sets `syncStatus: 'failed'` but doesn't clear progress fields
- When user clicks "Retry", old progress values remain
- Frontend shows confusing state: "Status: Failed" + "Processing 500/1000 emails (50%)"

```typescript
// Line 596-624: markSyncFailed
export async function markSyncFailed(userId: string, errorDetails?: string) {
  // ... existing code
  return await db.update(emailSyncStatus)
    .set({
      syncStatus: 'failed',
      errorDetails: errorDetails || null,
      lastSyncAttemptAt: new Date(),
      updatedAt: new Date()
      // ❌ Doesn't clear: totalEmails, processedEmails, progressPercentage, estimatedCompletion
    })
    .where(eq(emailSyncStatus.userId, userId))
    .returning();
}
```

**Symptoms**:
- Sync fails at 50% (500/1000 emails)
- User sees "Sync Failed" with 50% progress bar
- User clicks "Retry"
- New sync shows old progress initially, then jumps around confusingly

**Recommended Fix**:
```typescript
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
        // Clear progress on failure
        totalEmails: null,
        processedEmails: 0,
        progressPercentage: '0.00',
        estimatedCompletion: null,
        lastSyncAttemptAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailSyncStatus.userId, userId))
      .returning();
  }
  // ... rest of function
}
```

---

### 8. **No Timeout for Stuck Trigger.dev Tasks**

**Location**: `apps/main/trpc/routers/emails.ts` (lines 58-66) and `packages/database/src/queries/operations/emailSync.ts` (lines 261-360)

**Issue**:
- Idempotency guard prevents re-triggering if sync is in active state
- If Trigger.dev task crashes or never starts, database stays in active state forever
- No automatic timeout to mark sync as failed after reasonable time
- User is permanently stuck, can't retry without manual DB intervention

```typescript
// emails.ts - Idempotency guard blocks retry
if (activePhases.includes(unified.phase as any) && unified.phase !== 'stalled') {
  return { success: true, message: "Email sync already in progress." };
}

// emailSync.ts - Staleness check is only 5 minutes
const STALE_MS = 5 * 60 * 1000; // 5 minutes
// ❌ After 5 minutes, shows as 'stalled' but still blocks retry for first few minutes
```

**Symptoms**:
- User clicks "Start Sync"
- Trigger.dev environment is down or quota exceeded
- Task never actually starts
- Database shows status='in_progress' forever
- User can't retry for 5 minutes
- Even after 5 minutes, clicking retry might not help if task is truly stuck

**Recommended Fix**:
```typescript
// Add task timeout tracking
export async function initializeSync(userId: string, totalEmails: number): Promise<void> {
  const initialData = {
    totalEmails,
    processedEmails: 0,
    progressPercentage: '0.00',
    estimatedCompletion: null,
    syncStatus: 'syncing' as const,
    lastSyncAttemptAt: new Date(),
    // Add timeout deadline
    syncTimeoutAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minute absolute timeout
    updatedAt: new Date(),
  };
  // ... rest of function
}

// Check timeout in getUnifiedSyncState
export async function getUnifiedSyncState(userId: string): Promise<UnifiedEmailSyncState> {
  const row = statusRows[0];
  
  // Check for absolute timeout
  if (row && row.syncTimeoutAt && Date.now() > row.syncTimeoutAt.getTime()) {
    // Auto-mark as failed if sync took too long
    await markSyncFailed(userId, 'Sync timed out after 30 minutes');
    return {
      state: 'sync_failed',
      phase: 'failed',
      // ... rest of return
    };
  }
  
  // ... rest of function
}

// Allow retry for failed/stalled tasks
initiateSync: protectedProcedure.mutation(async ({ ctx }) => {
  const unified = await getUnifiedSyncState(ctx.userId!);
  
  // Allow retry if failed, stalled, OR if stuck in active state for > 10 minutes
  const activePhases = ['counting_emails', 'in_progress', 'syncing'];
  const isStuckActive = activePhases.includes(unified.phase as any) && 
    unified.updatedAt && 
    (Date.now() - unified.updatedAt.getTime()) > 10 * 60 * 1000;
  
  if (activePhases.includes(unified.phase as any) && !isStuckActive) {
    return { success: true, message: "Email sync already in progress." };
  }
  
  // If stuck, clear it before retrying
  if (isStuckActive) {
    await markSyncFailed(ctx.userId!, 'Previous sync appears stuck, retrying');
  }
  
  // ... rest of function
});
```

---

### 9. **Missing State Transition: 'in_progress' Phase Never Actually Set**

**Location**: `packages/tasks/src/trigger/processEmails.ts` (lines 306, 417)

**Issue**:
- Code calls `markSyncInProgress()` at line 306
- Immediately enters Gmail message counting loop
- Then calls `markSyncCountingEmails()` at line 417, overwriting 'in_progress'
- The 'in_progress' phase exists in type definitions but is never actually visible to frontend
- Frontend checks for 'in_progress' phase but it's always skipped

```typescript
// Line 306: Sets status to 'in_progress'
await markSyncInProgress(payload.userId);

// Lines 308-414: Gmail counting (can take minutes)
// During this time, status is 'in_progress'
// But updatedAt is NOT updated, so becomes stale

// Line 417: Overwrites to 'counting_emails'
await markSyncCountingEmails(payload.userId);
// ❌ 'in_progress' phase is too brief to be useful
```

**Frontend expects this flow**:
```typescript
// useEmailSync.ts - Line 14-15
const isCountingEmails = state?.phase === 'counting_emails';
const isInProgress = state?.phase === 'in_progress'; // ❌ Never true in practice
```

**Recommended Fix**:
```typescript
// Option 1: Remove 'in_progress' phase entirely (simplify)
// Update type definition to only include phases that actually occur
type Phase = 'idle' | 'counting_emails' | 'syncing' | 'complete' | 'failed' | 'stalled';

// Option 2: Make 'in_progress' meaningful
export const processEmails = task({
  run: async (payload: { userId: string; syncPeriodDays?: number }) => {
    // ... auth and setup
    
    // Use 'in_progress' for the counting phase
    await markSyncInProgress(payload.userId); // Sets status='in_progress'
    
    let allMessages = [];
    while (true) {
      pageCount++;
      
      // Update status every 10 pages to prevent staleness
      if (pageCount % 10 === 0) {
        await db.update(emailSyncStatus)
          .set({ updatedAt: new Date() })
          .where(eq(emailSyncStatus.userId, payload.userId));
      }
      
      const gmailData = await fetchGmailMessages(/*...*/);
      // ... rest of counting logic
    }
    
    // Transition to 'syncing' after counting completes
    await initializeSync(payload.userId, allMessages.length); // Sets status='syncing'
    
    // ... process batches
  }
});
```

---

### 10. **Error Recovery Loop: Retry After OAuth Error Can Re-trigger Same Error**

**Location**: `apps/main/hooks/useEmailSync.ts` (lines 45-47) and `packages/tasks/src/trigger/processEmails.ts` (lines 274-300)

**Issue**:
- When OAuth error occurs, it's stored in database
- User sees error message with "Retry" button
- If user clicks "Retry" without re-authenticating, the same OAuth error occurs immediately
- Frontend shows brief "Starting..." then back to error
- User stuck in retry loop

```typescript
// useEmailSync.ts - Retry just calls start() again
async function retry() {
  await start(); // ❌ No check if OAuth error still exists
}

// processEmails.ts - Token refresh will fail again
const tokenResult = await refreshGoogleToken(payload.userId);
if (!tokenResult.success) {
  // Same OAuth error occurs
  await markSyncFailedWithOAuthError(payload.userId, tokenResult.error);
  return { success: false, /*...*/ };
}
```

**Symptoms**:
- User's Google permission is revoked
- Sync fails with "Permission denied" OAuth error
- User clicks "Retry" (instead of "Reconnect Google")
- Sync starts → fails immediately → same error shown
- User confused why retry doesn't work

**Recommended Fix**:
```typescript
// useEmailSync.ts - Check for OAuth errors before retry
async function retry() {
  // If there's an OAuth error requiring reauth, don't allow retry
  if (data?.oauth?.requiresReauth) {
    // Should reconnect instead
    console.warn('Cannot retry with OAuth error - user must reconnect');
    return;
  }
  
  await start();
}

// Better: Hide retry button when reauth is needed
const cta = useMemo(() => {
  if (!data) return { label: 'Start', action: start } as const;
  
  // Always prioritize OAuth reauth over retry
  if (data.oauth?.requiresReauth) {
    return { label: 'Reconnect Google', action: reconnect } as const;
  }
  
  if (data.phase === 'failed' || data.phase === 'stalled') {
    return { label: 'Retry', action: retry } as const;
  }
  
  if (data.phase === 'idle' || data.state === 'new_user') {
    return { label: 'Start', action: start } as const;
  }
  
  return null;
}, [data]);

// SyncInitiator.tsx - Don't show retry for OAuth errors
{isFailed && !requiresReauth && (
  <Button onClick={() => cta?.action()}>
    Retry
  </Button>
)}

{requiresReauth && (
  <Button onClick={() => cta?.action()}>
    <Lock className="mr-2" />
    Reconnect Google
  </Button>
)}
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. **Unclear Error Messages for Different Failure Types**

**Issue**: All sync failures show generic "Sync failed. Please try again." message
**Impact**: Users don't know if they should retry, wait, or contact support
**Recommended Fix**: Categorize errors and show appropriate messages:
- Network errors: "Connection lost. Please check your internet and try again."
- Rate limit errors: "Gmail API limit reached. Please wait 10 minutes and retry."
- Permission errors: "Permission denied. Please reconnect your Google account."
- Unknown errors: "Something went wrong. If this persists, contact support."

### 12. **No Progress Persistence on Page Reload**

**Issue**: If user refreshes page during sync, progress resets to 0% visually
**Impact**: Users think sync restarted from scratch
**Recommended Fix**: Already works correctly - backend persists progress, just needs better UI messaging

### 13. **ETA Calculation Can Show Impossible Times**

**Issue**: `estimatedCompletion` calculation can show times in the past or far future
**Location**: `packages/database/src/queries/operations/emailSync.ts` (lines 432-446)
**Recommended Fix**: Add bounds checking and "Almost done..." fallback

---

## 📊 SUMMARY TABLE

| Issue | Severity | User Impact | Fix Complexity |
|-------|----------|-------------|----------------|
| 1. Staleness during counting | 🔴 Critical | User stuck on loading | Medium |
| 2. Race condition on retry | 🔴 Critical | Duplicate syncs, wrong progress | High |
| 3. OAuth state after reauth | 🔴 Critical | Confusing mixed state | Low |
| 4. Infinite polling on error | 🔴 Critical | Stuck on loading forever | Medium |
| 5. Silent progress failures | 🔴 Critical | Progress stuck at X% | Medium |
| 6. Manual reload required | 🟡 Medium | Poor UX after completion | Low |
| 7. Failed sync progress | 🟡 Medium | Confusing retry state | Low |
| 8. No timeout for stuck tasks | 🔴 Critical | Permanently stuck | High |
| 9. Missing in_progress phase | 🟢 Low | Unused code, confusion | Low |
| 10. OAuth retry loop | 🟡 Medium | Frustrating retry attempts | Low |

---

## 🎯 RECOMMENDED PRIORITY ORDER

### Phase 1 (Immediate - Blocks users completely)
1. **Issue #8**: Add timeout for stuck tasks
2. **Issue #1**: Fix staleness during counting phase
3. **Issue #4**: Stop infinite polling on errors

### Phase 2 (High Impact - Common user frustration)
4. **Issue #2**: Fix race condition on retry
5. **Issue #3**: Clear progress after reauth
6. **Issue #5**: Retry progress updates

### Phase 3 (Polish - Better UX)
7. **Issue #10**: Prevent OAuth retry loop
8. **Issue #7**: Clear progress on failure
9. **Issue #6**: Auto-navigate on completion
10. **Issue #9**: Clean up in_progress phase

---

## 🧪 TESTING SCENARIOS

After fixes, test these edge cases:

1. **Large mailbox (10k+ emails)**
   - Should NOT show "stalled" during counting
   - Should show progress updates every 10 pages

2. **Trigger.dev down**
   - Should timeout after 30 minutes
   - Should allow retry after timeout

3. **Network disconnects mid-sync**
   - Should stop polling after 3 failures
   - Should show clear error message
   - Should allow retry when network returns

4. **OAuth permission revoked mid-sync**
   - Should show "Reconnect Google" button
   - Should NOT show "Retry" button
   - After reauth, should clear old progress

5. **Multiple tabs/windows**
   - Only one sync should start
   - Other tabs should see "Already in progress"

6. **Page refresh during sync**
   - Should resume showing progress
   - Should NOT restart sync

7. **Rapid retry clicks**
   - Should prevent duplicate syncs
   - Should show "Already in progress" message

---

## 📝 CODE CHANGES SUMMARY

### Files that need changes:

1. **`packages/tasks/src/trigger/processEmails.ts`**
   - Add periodic `updatedAt` updates during counting (Issue #1)
   - Add timeout tracking (Issue #8)

2. **`apps/main/trpc/routers/emails.ts`**
   - Add atomic database lock for idempotency (Issue #2)
   - Add timeout check before sync (Issue #8)

3. **`packages/database/src/queries/operations/emailSync.ts`**
   - Clear progress in `resetSyncStatusAfterReauth` (Issue #3)
   - Clear progress in `markSyncFailed` (Issue #7)
   - Add timeout checking in `getUnifiedSyncState` (Issue #8)

4. **`apps/main/hooks/useEmailSync.ts`**
   - Stop polling on query errors (Issue #4)
   - Prevent retry for OAuth errors (Issue #10)
   - Auto-navigate on completion (Issue #6)

5. **`packages/tasks/src/trigger/processEmailBatch.ts`**
   - Retry failed progress updates (Issue #5)

6. **`apps/main/components/common/SyncInitiator.tsx`**
   - Auto-navigate on complete (Issue #6)
   - Show appropriate buttons for OAuth vs sync errors (Issue #10)

---

## 🚀 DEPLOYMENT STRATEGY

1. **Deploy backend changes first** (database + Trigger.dev)
   - Issues #1, #2, #3, #5, #7, #8
   - Test in staging with large mailbox

2. **Deploy frontend changes** (React hooks + components)
   - Issues #4, #6, #9, #10
   - Test error scenarios

3. **Monitor for 48 hours**
   - Watch for new edge cases
   - Check Sentry for errors
   - Monitor user support requests

---

## 📚 ADDITIONAL RECOMMENDATIONS

### Observability
- Add more granular logging in Trigger.dev tasks
- Track metrics: sync duration, failure rate, retry rate
- Alert if sync success rate drops below 95%

### User Communication
- Add in-app notifications for long-running syncs
- Email notification on sync completion/failure
- Status page showing if sync service is degraded

### Performance
- Consider incremental sync for subsequent syncs (vs full resync)
- Batch progress updates (update every 10 emails instead of every 1)
- Add caching for Gmail API responses

---

## ✅ VALIDATION CHECKLIST

After implementing fixes, verify:

- [ ] Users can start sync successfully
- [ ] Progress updates continuously without getting stuck
- [ ] Staleness detection only triggers for truly stuck syncs
- [ ] Retry works correctly after failed/stalled state
- [ ] OAuth errors show correct "Reconnect" button
- [ ] Multiple retry clicks don't start duplicate syncs
- [ ] Page refresh during sync shows correct progress
- [ ] Sync completes and auto-navigates to dashboard
- [ ] Network errors stop polling and show error message
- [ ] Timeout mechanism catches truly stuck tasks

---

**Analysis completed on**: 2025-10-11
**Files analyzed**: 8 files across FE, BE, and Trigger.dev
**Critical issues found**: 10
**Estimated fix effort**: 2-3 days for all critical issues
