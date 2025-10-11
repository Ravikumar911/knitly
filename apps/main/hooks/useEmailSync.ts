'use client';

import { useMemo, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { createClient } from '@/supabase/client';

type UnifiedState = import('@workspace/database').UnifiedEmailSyncState;

function computeRefetchInterval(state?: UnifiedState, hasError?: boolean): number | false {
  // FIX Issue #4: Stop polling if there's a query error
  if (hasError) return false;
  
  if (!state) return false;
  const active = ['counting_emails', 'in_progress', 'syncing', 'stalled'] as const;
  if (active.includes(state.phase as any)) {
    return state.phase === 'stalled' ? 4000 : 1500;
  }
  return false;
}

export function useEmailSync() {
  const trpc = useTRPC();
  const supabase = createClient();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const queryOptions = useMemo(() => trpc.emails.state.queryOptions(), [trpc.emails.state]);

  const { data, refetch, isFetching, isLoading, error } = useQuery({
    ...queryOptions,
    refetchInterval: (q) => {
      const s = q.state.data as UnifiedState | undefined;
      const hasError = !!q.state.error;
      return computeRefetchInterval(s, hasError);
    },
    // FIX Issue #4: Add retry limits to prevent infinite retries
    retry: (failureCount, error) => {
      // Stop retrying after 3 consecutive failures
      if (failureCount >= 3) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // FIX: Add timeout detection for stuck loading states
  useEffect(() => {
    if (!data && isLoading && !error) {
      const timeout = setTimeout(() => {
        setHasTimedOut(true);
      }, 15000); // 15 seconds timeout
      return () => clearTimeout(timeout);
    } else {
      setHasTimedOut(false);
    }
  }, [data, isLoading, error]);

  const startMutation = useMutation(trpc.emails.initiateSync.mutationOptions({
    onSuccess: () => {
      refetch();
    },
  }));

  async function start() {
    await startMutation.mutateAsync();
  }

  async function retry() {
    // FIX Issue #10: Don't allow retry if OAuth error requires reauth
    if (data?.oauth?.requiresReauth) {
      console.warn('Cannot retry with OAuth error requiring reauth - user must reconnect');
      return;
    }
    
    await start();
  }

  async function reconnect() {
    // Launch OAuth on explicit user action only
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/gmail.readonly' } });
  }

  const statusLabel = useMemo(() => {
    if (error || hasTimedOut) return 'Connection Error';
    if (!data) return 'Checking status';
    switch (data.phase) {
      case 'idle': return 'Ready';
      case 'counting_emails': return 'Analyzing mailbox';
      case 'in_progress': return 'Preparing';
      case 'syncing': return 'Processing emails';
      case 'complete': return 'Complete';
      case 'failed': return 'Failed';
      case 'stalled': return 'Stalled';
      default: return 'Unknown';
    }
  }, [data, error, hasTimedOut]);

  const statusDescription = useMemo(() => {
    if (error || hasTimedOut) {
      return 'Unable to connect to the server. Please check your connection and try again.';
    }
    if (!data) return 'Loading current sync state...';
    if (data.oauth?.requiresReauth) return data.oauth.userFriendlyMessage || 'Permission required to continue.';
    if (data.phase === 'syncing' && data.progress.total) {
      const remaining = (data.progress.total || 0) - (data.progress.processed || 0);
      return `${remaining} remaining (${data.progress.percent.toFixed(0)}%)`;
    }
    if (data.phase === 'stalled') return 'Sync appears stalled. You can retry.';
    if (data.phase === 'failed') return 'Sync failed. Please try again.';
    return undefined;
  }, [data, error, hasTimedOut]);

  async function manualRefetch() {
    setHasTimedOut(false);
    await refetch();
  }

  const cta = useMemo(() => {
    // FIX: Show retry button when there's an error or timeout
    if (error || hasTimedOut) {
      return { label: 'Retry Connection', action: manualRefetch } as const;
    }
    
    if (!data) return null; // Show loading state without CTA initially
    
    // FIX Issue #10: Always prioritize OAuth reauth over retry
    if (data.oauth?.requiresReauth) {
      return { label: 'Reconnect Google', action: reconnect } as const;
    }
    
    // Only show retry for non-OAuth failures
    if (data.phase === 'failed' || data.phase === 'stalled') {
      return { label: 'Retry', action: retry } as const;
    }
    
    if (data.phase === 'idle' || data.state === 'new_user') {
      return { label: 'Start', action: start } as const;
    }
    
    return null;
  }, [data, error, hasTimedOut]);

  return {
    state: data,
    isLoading: isLoading || isFetching,
    error: error || (hasTimedOut ? new Error('Connection timeout') : null),
    start,
    retry,
    reconnect,
    statusLabel,
    statusDescription,
    cta,
    refetch,
    hasTimedOut,
  };
}


