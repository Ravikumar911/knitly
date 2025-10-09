'use client';

import { useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { createClient } from '@/supabase/client';

type UnifiedState = import('@workspace/database').UnifiedEmailSyncState;

function computeRefetchInterval(state?: UnifiedState): number | false {
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
      return computeRefetchInterval(s);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const startMutation = useMutation(trpc.emails.initiateSync.mutationOptions({
    onSuccess: () => {
      refetch();
    },
  }));

  async function start() {
    await startMutation.mutateAsync();
  }

  async function retry() {
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
    if (data.oauth?.requiresReauth) return { label: 'Reconnect Google', action: reconnect } as const;
    if (data.phase === 'failed' || data.phase === 'stalled') return { label: 'Retry', action: retry } as const;
    if (data.phase === 'idle' || data.state === 'new_user') return { label: 'Start', action: start } as const;
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


