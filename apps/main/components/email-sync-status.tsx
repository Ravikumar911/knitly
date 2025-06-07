'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useTRPC } from '@/trpc/client';
import { createClient } from '@/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Progress } from '@workspace/ui/components/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@workspace/ui/components/card';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';

export function EmailSyncStatus() {
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const trpc = useTRPC();

  // Get the current sync status
  const { data: syncStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = 
    useQuery(trpc.emails.getSyncStatus.queryOptions());

  // Mutation for triggering an email sync
  const mutation = useMutation(trpc.emails.refresh.mutationOptions({
    onSuccess: () => {
      refetchStatus();
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        setError(err.message || "Failed to refresh emails");
      } else {
        setError("An error occurred while refreshing emails");
      }
    }
  }));

  // Start a sync operation
  const handleSync = () => {
    setError(null);
    mutation.mutate();
  };

  // Setup Supabase Realtime subscription for sync status updates
  useEffect(() => {
    const supabase = createClient();
    
    // Create a channel to listen for changes to the email_sync_status table
    const channel = supabase
      .channel('email-sync-status-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'email_sync_status',
      }, (payload) => {
        
        // Refetch the status when there's an update
        refetchStatus();
        
        // If the sync is in progress, show a simulated progress
        if (payload.new && payload.new.sync_status === 'in_progress') {
          // Simple progress simulation - in a real app you might have actual progress data
          setSyncProgress(prevProgress => {
            if (prevProgress < 90) {
              return prevProgress + 10;
            }
            return prevProgress;
          });
        } else if (payload.new && payload.new.sync_status === 'complete') {
          setSyncProgress(100);
          
          // Reset progress after a delay
          setTimeout(() => {
            setSyncProgress(0);
          }, 3000);
        }
      })
      .subscribe();
    
    setRealtimeChannel(channel);
    
    return () => {
      // Clean up the subscription
      channel.unsubscribe();
    };
  }, [refetchStatus]);

  if (isLoadingStatus) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If user has not synced, or we're in the middle of a sync
  const isInProgress = syncStatus?.syncStatus === 'in_progress';
  const hasSynced = syncStatus?.hasSynced;
  const syncFailed = syncStatus?.syncStatus === 'failed';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{hasSynced ? 'Email Sync Status' : 'Set Up Your Email Sync'}</CardTitle>
        <CardDescription>
          {hasSynced 
            ? 'Your email sync status and controls' 
            : 'Start syncing your emails to see transactions in your dashboard'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error message */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Sync failed message */}
        {syncFailed && (
          <Alert variant="destructive">
            <AlertTitle>Sync Failed</AlertTitle>
            <AlertDescription>
              {syncStatus?.errorDetails || 'There was an error syncing your emails. Please try again.'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* If we have never synced, show a welcome message */}
        {!hasSynced && !isInProgress && (
          <Alert>
            <AlertTitle>No Email Data</AlertTitle>
            <AlertDescription>
              Your dashboard is waiting for email data. Click the button below to start syncing.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Show sync progress */}
        {(isInProgress || syncProgress > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Syncing emails...</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}
        
        {/* Show last sync time if available */}
        {hasSynced && syncStatus?.lastSyncedAt && (
          <div className="text-sm text-muted-foreground">
            Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleSync} 
          disabled={mutation.isPending || isInProgress}
          className="w-full"
        >
          {mutation.isPending || isInProgress 
            ? 'Syncing...' 
            : hasSynced 
              ? 'Sync Again' 
              : 'Start Email Sync'
          }
        </Button>
      </CardFooter>
    </Card>
  );
} 