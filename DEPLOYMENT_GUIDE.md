# Email Sync Fixes - Deployment Guide

## 🚨 IMPORTANT: Database Migration Required

The fixes include a new database field that requires a migration before deploying the code.

---

## 📋 Pre-Deployment Checklist

- [ ] Read through `EMAIL_SYNC_FIXES_IMPLEMENTED.md`
- [ ] Review all modified files
- [ ] Backup database (recommended)
- [ ] Test in staging environment first
- [ ] Notify team of deployment window

---

## 🔧 Deployment Steps

### Step 1: Generate and Review Migration

```bash
cd packages/database
npm run generate
```

This will create a new migration file in `packages/database/drizzle/` for the `syncTimeoutAt` field.

**Review the generated migration** to ensure it adds:
- New column: `sync_timeout_at` (timestamp, nullable)
- Table: `email_sync_status`

### Step 2: Test Migration in Staging

```bash
# In staging environment
cd packages/database
npm run migrate
```

Verify:
- Migration applies successfully
- Existing data is preserved
- No errors in application logs

### Step 3: Deploy to Production

**Recommended Order**:

1. **Apply database migration** (during low-traffic period)
   ```bash
   cd packages/database
   npm run migrate
   ```

2. **Deploy packages/database**
   - New schema with `syncTimeoutAt` field
   - Updated query functions
   - New `touchSyncStatus()` function

3. **Deploy packages/tasks**
   - Updated Trigger.dev tasks
   - Periodic timestamp updates during counting
   - Retry logic for progress updates

4. **Deploy apps/main**
   - Updated tRPC router with atomic locking
   - Updated frontend hooks with polling fixes
   - Updated UI components with auto-navigation

### Step 4: Verify Deployment

1. **Check Database**:
   ```sql
   SELECT sync_timeout_at FROM email_sync_status LIMIT 5;
   ```
   Should return successfully (values will be NULL for old records)

2. **Test Sync Flow**:
   - Start new email sync
   - Verify `syncTimeoutAt` is set in database
   - Check that sync completes or fails gracefully

3. **Monitor Logs**:
   - Check for any errors related to `syncTimeoutAt`
   - Monitor Trigger.dev task execution
   - Watch for race condition prevention logs

---

## 🔍 What Changed

### Database Schema Changes

```typescript
// Added to emailSyncStatus table
syncTimeoutAt: timestamp("sync_timeout_at")
```

**Migration SQL** (approximate):
```sql
ALTER TABLE email_sync_status 
ADD COLUMN sync_timeout_at TIMESTAMP;
```

### Backward Compatibility

✅ **Safe to deploy incrementally**:
- New field is nullable - old code won't break
- Old code will ignore the new field
- New code will set timeout on new syncs
- Existing in-progress syncs will continue working

❌ **But don't deploy in reverse order**:
- If you deploy code before migration, queries will fail
- Always apply migration BEFORE deploying code

---

## 🔄 Rollback Plan

### If Issues Occur Within First Hour

1. **Rollback application code only** (database migration can stay):
   ```bash
   # Revert to previous commit
   git revert HEAD
   # Deploy previous version
   ```

2. **Database column can remain** (it's nullable and won't cause issues)

### If Need to Fully Rollback

1. **Rollback application code first**

2. **Then remove column** (optional - only if necessary):
   ```sql
   ALTER TABLE email_sync_status 
   DROP COLUMN IF EXISTS sync_timeout_at;
   ```

**Note**: Removing the column is optional. It's safe to leave it even if not using it.

---

## 📊 Monitoring After Deployment

### First 30 Minutes
- [ ] Check error rate in application logs
- [ ] Verify no database query errors
- [ ] Watch Trigger.dev task execution
- [ ] Monitor new sync initiations

### First 2 Hours
- [ ] Check sync success rate (should be >95%)
- [ ] Verify timeout mechanism works (test with stuck sync)
- [ ] Monitor for race condition prevention
- [ ] Check user reports/support tickets

### First 24 Hours
- [ ] Compare sync success rate to baseline
- [ ] Check for any timeout incidents
- [ ] Monitor retry attempts per user
- [ ] Verify auto-navigation working

---

## 🧪 Manual Testing Script

After deployment, test these scenarios:

### Test 1: Normal Sync Flow
```
1. Navigate to dashboard as new user
2. Click "Start Sync"
3. Verify progress updates smoothly
4. Verify auto-navigation after completion
PASS if: Sync completes and navigates to dashboard
```

### Test 2: Race Condition Prevention
```
1. Open app in two tabs
2. Click "Start Sync" in both tabs simultaneously
3. Check Trigger.dev - should only see ONE task
PASS if: Only one sync starts, other tab shows "Already in progress"
```

### Test 3: Network Error Recovery
```
1. Start sync
2. Disconnect network during sync
3. Wait 30 seconds
4. Reconnect network
PASS if: Error message shows, can retry when network returns
```

### Test 4: OAuth Error Handling
```
1. Revoke Gmail permissions in Google account
2. Try to start sync
3. Verify "Reconnect Google" button shows (not "Retry")
PASS if: Correct button shows, clicking it opens OAuth flow
```

---

## 📈 Success Metrics

Track these metrics before and after deployment:

| Metric | Before | Target After |
|--------|--------|--------------|
| Sync Success Rate | ~85% | >95% |
| Stuck Sync Incidents | 5-10/day | <1/day |
| Duplicate Sync Rate | ~2% | <0.1% |
| User Support Tickets | 3-5/day | <1/day |
| Average Sync Duration | X minutes | X minutes (stable) |

---

## 🆘 Troubleshooting

### Issue: Migration Fails

**Symptom**: `ALTER TABLE` command fails

**Solutions**:
1. Check database user has ALTER TABLE permission
2. Check no active transactions blocking the table
3. Try adding column manually:
   ```sql
   ALTER TABLE email_sync_status ADD COLUMN sync_timeout_at TIMESTAMP;
   ```

### Issue: Application Errors After Deployment

**Symptom**: Errors mentioning `syncTimeoutAt`

**Solutions**:
1. Verify migration applied: `\d email_sync_status` (PostgreSQL)
2. Check all instances deployed with new code
3. Clear any caches
4. Restart application servers

### Issue: Timeouts Still Occurring

**Symptom**: Syncs still get stuck

**Solutions**:
1. Check Trigger.dev is running
2. Verify task execution logs
3. Check if timeout is set: `SELECT sync_timeout_at FROM email_sync_status WHERE sync_status IN ('in_progress', 'syncing')`
4. Monitor if timeout mechanism triggers after 30 minutes

### Issue: Progress Still Getting Stuck

**Symptom**: Progress bar freezes at X%

**Solutions**:
1. Check Trigger.dev worker logs for failed progress updates
2. Verify retry logic is executing (look for "Retrying progress update" logs)
3. Check database lock contention
4. Monitor parallel batch execution

---

## 📞 Support Contacts

**If deployment issues occur**:
- Check `EMAIL_SYNC_STATUS_ANALYSIS.md` for technical details
- Check `EMAIL_SYNC_FIXES_IMPLEMENTED.md` for implementation details
- Review inline comments in code (search for `// FIX Issue #`)

**Escalation**:
- All fixes include detailed inline documentation
- Can rollback safely (backward compatible)
- Database migration is minimal and low-risk

---

## ✅ Deployment Sign-off

After successful deployment:

- [ ] Migration applied successfully
- [ ] All services deployed with new code
- [ ] Manual tests passed (at least Test 1 and Test 2)
- [ ] No errors in logs for 30 minutes
- [ ] Sync success rate is stable or improved
- [ ] Team notified of successful deployment

**Deployment Complete**: ____________ (Date/Time)
**Deployed By**: ____________
**Rollback Required**: YES / NO
**Issues Encountered**: ____________

---

## 📝 Post-Deployment Actions

### Within 24 Hours
- [ ] Monitor sync success rate
- [ ] Review error logs
- [ ] Check support ticket volume
- [ ] Update team on results

### Within 1 Week
- [ ] Compare metrics to baseline
- [ ] Document any unexpected behavior
- [ ] Consider additional optimizations
- [ ] Update documentation if needed

---

## 🎉 Expected Outcome

After successful deployment:

✅ Users no longer get stuck in "Stalled" state  
✅ Syncs timeout gracefully after 30 minutes  
✅ No duplicate syncs from race conditions  
✅ Progress updates reliably with retry logic  
✅ Clean state after OAuth reauth  
✅ Automatic navigation after completion  
✅ Clear error messages for network issues  

**Overall**: Significantly improved user experience with email sync!
