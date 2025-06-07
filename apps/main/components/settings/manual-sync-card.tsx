'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useTRPC } from '@/trpc/client';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Progress } from '@workspace/ui/components/progress';
import { Mail, Zap, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export function ManualSyncCard() {
  const [error, setError] = useState<string | null>(null);
  const [syncTriggered, setSyncTriggered] = useState(false);
  const trpc = useTRPC();

  // Mutation to start sync
  const initiateSyncMutation = useMutation(trpc.emails.initiateSync.mutationOptions({
    onSuccess: () => {
      setError(null);
      setSyncTriggered(true);
    },
    onError: (err) => {
      setSyncTriggered(false);
      if (err instanceof TRPCClientError) {
        setError(err.message || "Failed to start email sync");
      } else {
        setError("An error occurred while starting email sync");
      }
    }
  }));

  // Query sync progress only when sync is triggered
  const { data: progressData } = useQuery({
    ...trpc.emails.getSyncProgress.queryOptions(),
    refetchInterval: (query) => {
      const data = query.state.data;
      const syncStatus = data?.syncStatus;
      
      const activeSyncStates = ['counting_emails', 'in_progress', 'syncing'];
      const shouldPoll = syncTriggered && syncStatus && activeSyncStates.includes(syncStatus);
      
      return shouldPoll ? 1000 : false;
    },
    enabled: syncTriggered,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Get last sync info
  const { data: lastSyncData } = useQuery({
    ...trpc.emails.getSyncStatus.queryOptions(),
    refetchOnMount: true,
  });

  // Determine current sync state
  const syncStatus = progressData?.syncStatus;
  const isInitiating = initiateSyncMutation.isPending;
  const isCountingEmails = syncStatus === 'counting_emails';
  const isInProgress = syncStatus === 'in_progress';
  const isSyncing = syncStatus === 'syncing';
  const hasTotalEmails = progressData?.totalEmails && progressData.totalEmails > 0;
  const isComplete = syncStatus === 'complete';
  const isFailed = syncStatus === 'failed';
  
  const isActiveSyncInProgress = isCountingEmails || isInProgress || isSyncing;

  // Reset syncTriggered when sync is complete or failed
  if (syncTriggered && (isComplete || isFailed)) {
    setSyncTriggered(false);
  }

  const getStatusIcon = () => {
    if (isComplete) return <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500" />;
    if (isFailed) return <AlertCircle className="h-6 w-6 text-destructive" />;
    if (isActiveSyncInProgress || isInitiating) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    return <RefreshCw className="h-6 w-6 text-primary" />;
  };

  const getStatusTitle = () => {
    if (isComplete) return 'Sync Complete!';
    if (isFailed) return 'Sync Failed';
    if (isInitiating) return 'Starting Email Sync';
    if (isCountingEmails) return 'Analyzing Your Gmail';
    if (isInProgress) return 'Preparing to Process';
    if (isSyncing) return 'Processing Your Emails';
    return 'Manual Email Sync';
  };

  const getStatusDescription = () => {
    if (isComplete) return 'Your emails have been successfully synced and updated!';
    if (isFailed) return 'Email sync failed. Please try starting the sync again.';
    if (isInitiating) return 'Initializing the sync process...';
    if (isCountingEmails) return 'Analyzing your Gmail account for new emails';
    if (isInProgress) return 'Preparing to process your emails...';
    if (isSyncing) return 'Processing emails in the background. You can safely navigate away from this page.';
    return 'Manually sync your emails to update your transaction data with the latest information';
  };

  const formatTimeRemaining = (estimatedCompletion: string | null) => {
    if (!estimatedCompletion) return null;
    
    const now = new Date();
    const completion = new Date(estimatedCompletion);
    const diffMs = completion.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Almost done...';
    
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `~${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
    }
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `~${hours}h ${minutes}m remaining`;
  };

  const handleStartSync = () => {
    setError(null);
    setSyncTriggered(true);
    initiateSyncMutation.mutate();
  };

  const handleRetrySync = () => {
    setError(null);
    setSyncTriggered(true);
    initiateSyncMutation.mutate();
  };

  return (
    <Card className="w-full shadow-lg border bg-card">
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-4">
          {getStatusIcon()}
        </div>
        <CardTitle className="text-xl font-bold">
          {getStatusTitle()}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {getStatusDescription()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Last Sync Information */}
        {!syncTriggered && !isActiveSyncInProgress && lastSyncData?.lastSyncedAt && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Last synced:</strong> {new Date(lastSyncData.lastSyncedAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}

        {/* Progress Section - Only show during sync */}
        {(isActiveSyncInProgress || isComplete) && (
          <div className="space-y-4">
            {/* Progress Bar */}
            {hasTotalEmails && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {progressData.processedEmails?.toLocaleString() || 0} of {progressData.totalEmails?.toLocaleString() || 0} emails processed
                  </span>
                  <span className="font-medium">
                    {Math.round(progressData.progressPercentage || 0)}%
                  </span>
                </div>
                <Progress 
                  value={progressData.progressPercentage || 0} 
                  className="h-3"
                />
              </div>
            )}

            {/* Time Remaining */}
            {progressData?.estimatedCompletion && !isComplete && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTimeRemaining(progressData.estimatedCompletion)}
              </div>
            )}

            {/* Email Count Display */}
            {hasTotalEmails && !isComplete && (
              <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  Found {progressData.totalEmails?.toLocaleString()} emails to process
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Section */}
        <div className="space-y-4">
          {isComplete ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Email sync completed successfully! Your transaction data has been updated.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleStartSync}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isInitiating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Again
              </Button>
            </div>
          ) : isFailed ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Email sync failed. Please try starting the sync again.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleRetrySync}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isInitiating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : !syncTriggered && !isActiveSyncInProgress ? (
            <div className="space-y-4">
              <Button 
                onClick={handleStartSync}
                disabled={isInitiating}
                size="lg"
                className="w-full"
              >
                {isInitiating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting Sync...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Email Sync
                  </>
                )}
              </Button>
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This will scan your Gmail for new emails and update your transaction data. 
                  The process typically takes a few minutes depending on the number of new emails.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                {isSyncing ? 'Processing emails in background...' : 'Starting sync process...'}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 