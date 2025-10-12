'use client';

import React, { useMemo, useRef, useEffect } from 'react';
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

  // FIX: Refetch once when sync completes to ensure we have the latest state with hasInitialSync
  const prevPhase = useRef(data?.phase);
  useEffect(() => {
    if (prevPhase.current !== 'complete' && data?.phase === 'complete') {
      // Transition to complete detected, refetch to get final state
      setTimeout(() => refetch(), 500);
    }
    prevPhase.current = data?.phase;
  }, [data?.phase, refetch]);

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
  }, [data]);

  const statusDescription = useMemo(() => {
    if (!data) return 'Loading current sync state...';
    if (data.oauth?.requiresReauth) return data.oauth.userFriendlyMessage || 'Permission required to continue.';
    if (data.phase === 'syncing' && data.progress.total) {
      const remaining = (data.progress.total || 0) - (data.progress.processed || 0);
      return `${remaining} remaining (${data.progress.percent.toFixed(0)}%)`;
    }
    if (data.phase === 'stalled') return 'Sync appears stalled. You can retry.';
    if (data.phase === 'failed') return 'Sync failed. Please try again.';
    return undefined;
  }, [data]);

  const cta = useMemo(() => {
    if (!data) return { label: 'Start', action: start } as const;
    
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
  }, [data]);

  return {
    state: data,
    isLoading: isLoading || isFetching,
    error,
    start,
    retry,
    reconnect,
    statusLabel,
    statusDescription,
    cta,
    refetch,
  };
}


