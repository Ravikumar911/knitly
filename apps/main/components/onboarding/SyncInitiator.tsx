'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useTRPC } from '@/trpc/client';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Mail, Zap, BarChart3, Shield, Loader2 } from 'lucide-react';
import { EmailCountDisplay } from './EmailCountDisplay';
import { SyncProgressTracker } from './SyncProgressTracker';

interface SyncInitiatorProps {
  dataStatus: {
    hasEmails: boolean;
    hasInitialSync: boolean;
    emailCount: number;
    needsSync: boolean;
  };
}

export function SyncInitiator({ dataStatus }: SyncInitiatorProps) {
  const [error, setError] = useState<string | null>(null);
  const trpc = useTRPC();

  // Mutation to start sync - following the same pattern as email-sync-status.tsx
  const initiateSyncMutation = useMutation(trpc.emails.initiateSync.mutationOptions({
    onSuccess: () => {
      setError(null);
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        setError(err.message || "Failed to start email analysis");
      } else {
        setError("An error occurred while starting email analysis");
      }
    }
  }));

  // Get sync progress - but only poll when sync is actually active
  const { data: progressData, isLoading: progressLoading } = useQuery({
    ...trpc.emails.getSyncProgress.queryOptions(),
    refetchInterval: (data) => {
      // Only poll if there's an active sync status
      const syncStatus = data?.syncStatus;
      const isActiveSyncStatus = syncStatus && [
        'counting_emails', 
        'in_progress', 
        'syncing'
      ].includes(syncStatus);
      
      // Poll every 2 seconds if sync is active, otherwise stop polling
      return isActiveSyncStatus ? 2000 : false;
    },
    // Start with a single fetch to check current state
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Determine current sync state from database
  const syncStatus = progressData?.syncStatus;
  const isInitiating = initiateSyncMutation.isPending;
  const isCountingEmails = syncStatus === 'counting_emails';
  const isInProgress = syncStatus === 'in_progress';
  const isSyncing = syncStatus === 'syncing';
  const hasTotalEmails = progressData?.totalEmails && progressData.totalEmails > 0;
  const isComplete = syncStatus === 'complete';
  const isFailed = syncStatus === 'failed';
  
  // Active sync states that should show progress
  const isActiveSyncInProgress = isCountingEmails || isInProgress || isSyncing;

  console.log('SyncInitiator Debug:', {
    syncStatus,
    isInitiating,
    isActiveSyncInProgress,
    hasTotalEmails,
    progressData
  });

  // Show progress tracker if we have total emails and sync is actively processing
  if (isSyncing && hasTotalEmails) {
    return <SyncProgressTracker />;
  }

  // Show email count if we have the total but still in early sync stages
  if (hasTotalEmails && (isCountingEmails || isInProgress || isSyncing)) {
    return (
      <div className="space-y-4">
        <EmailCountDisplay 
          totalEmails={progressData.totalEmails || undefined}
          estimatedMinutes={progressData.totalEmails ? Math.ceil(progressData.totalEmails / 1000) : undefined}
        />
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isCountingEmails 
              ? 'Preparing to process your emails...' 
              : 'Starting to process your emails...'
            }
          </p>
        </div>
      </div>
    );
  }

  // Show loading state only if we're initiating or there's an active sync without total count yet
  if (isInitiating || (isActiveSyncInProgress && !hasTotalEmails)) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isInitiating ? 'Starting email analysis...' : 'Counting your emails...'}
          </h3>
          <p className="text-sm text-gray-600 text-center">
            {isInitiating 
              ? 'Initializing the sync process' 
              : 'We\'re analyzing your Gmail account to see how many emails need processing'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show completion message if sync is complete
  if (isComplete) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-800">Email Sync Complete!</h3>
            <p className="text-sm text-gray-600">
              Your emails have been successfully analyzed. You can now view your insights in the dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if sync failed
  if (isFailed) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Email sync failed. Please try starting the sync again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Initial welcome screen - user hasn't started sync yet
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome Card */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Mail className="h-8 w-8 text-blue-600" />
            Welcome to Knitly
          </CardTitle>
          <CardDescription className="text-base">
            Get powerful insights from your email transactions and communication patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-sm">Transaction Analytics</h4>
              <p className="text-xs text-gray-600 mt-1">Track spending patterns and merchants</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <Zap className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-sm">Smart Processing</h4>
              <p className="text-xs text-gray-600 mt-1">AI-powered email analysis</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <Shield className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold text-sm">Secure & Private</h4>
              <p className="text-xs text-gray-600 mt-1">Your data stays protected</p>
            </div>
          </div>

          {/* Sync Button */}
          <div className="pt-4">
            <Button 
              onClick={() => initiateSyncMutation.mutate()}
              disabled={initiateSyncMutation.isPending}
              size="lg"
              className="w-full md:w-auto px-8"
            >
              {initiateSyncMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Email Analysis
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <Alert>
            <AlertDescription className="text-sm">
              We'll analyze your emails to extract transaction data and insights. 
              This process is secure and typically takes a few minutes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Error handling */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 