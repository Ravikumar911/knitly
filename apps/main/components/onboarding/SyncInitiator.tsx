'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useTRPC } from '@/trpc/client';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Progress } from '@workspace/ui/components/progress';
import { Mail, Zap, BarChart3, Shield, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';

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
  const [syncTriggered, setSyncTriggered] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
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
        setError(err.message || "Failed to start email analysis");
      } else {
        setError("An error occurred while starting email analysis");
      }
    }
  }));

  // Enhanced polling for sync progress
  const { data: progressData } = useQuery({
    ...trpc.emails.getSyncProgress.queryOptions(),
    refetchInterval: (query) => {
      const data = query.state.data;
      const syncStatus = data?.syncStatus;
      
      const activeSyncStates = ['counting_emails', 'in_progress', 'syncing'];
      const shouldPoll = syncTriggered || (syncStatus && activeSyncStates.includes(syncStatus));
      
      return shouldPoll ? 1000 : false;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
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

  // Helper functions for status display
  const getStatusIcon = () => {
    if (isComplete) return <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />;
    if (isFailed) return <AlertCircle className="h-8 w-8 text-destructive" />;
    return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
  };

  const getStatusTitle = () => {
    if (isComplete) return 'Sync Complete!';
    if (isFailed) return 'Sync Failed';
    if (isInitiating) return 'Starting Email Analysis';
    if (syncTriggered && !isActiveSyncInProgress) return 'Initiating Sync Process';
    if (isCountingEmails) return 'Analyzing Your Gmail';
    if (isInProgress) return 'Preparing to Process';
    if (isSyncing) return 'Processing Your Emails';
    return 'Welcome to Slash';
  };

  const getStatusDescription = () => {
    if (isComplete) return 'Your emails have been successfully analyzed and insights are ready!';
    if (isFailed) return 'Email sync failed. Please try starting the sync again.';
    if (isInitiating) return 'Initializing the sync process...';
    if (syncTriggered && !isActiveSyncInProgress) return 'Your sync request is being processed. This may take a moment...';
    if (isCountingEmails) return 'We\'re analyzing your Gmail account to see how many emails need processing';
    if (isInProgress) return 'Preparing to process your emails...';
    if (isSyncing) return 'Processing emails in the background. You can safely close this page and return later.';
    return 'Get powerful insights from your email transactions and communication patterns';
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

  // Show dashboard when user clicks the button
  if (showDashboard) {
    window.location.reload(); // This will trigger DataStatusChecker to show dashboard
    return null;
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Main Sync Card - Fixed dimensions to prevent CLS */}
        <Card className="w-full min-h-[600px] shadow-lg border bg-card backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              {(isInitiating || syncTriggered || isActiveSyncInProgress) ? (
                getStatusIcon()
              ) : (
                <Mail className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {getStatusTitle()}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {getStatusDescription()}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Progress Section - Always reserve space */}
            <div className="min-h-[120px] flex flex-col justify-center">
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
                        Found {progressData.totalEmails?.toLocaleString()} emails to analyze
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Welcome Features - Only show when not syncing */}
              {!syncTriggered && !isActiveSyncInProgress && !isComplete && !isFailed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Transaction Analytics</h4>
                    <p className="text-xs text-muted-foreground mt-1">Track spending patterns</p>
                  </div>
                  <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20 text-center">
                    <Zap className="h-6 w-6 text-chart-2 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Smart Processing</h4>
                    <p className="text-xs text-muted-foreground mt-1">AI-powered analysis</p>
                  </div>
                  <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20 text-center">
                    <Shield className="h-6 w-6 text-chart-3 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Secure & Private</h4>
                    <p className="text-xs text-muted-foreground mt-1">Data stays protected</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Section - Always reserve space */}
            <div className="min-h-[80px] flex flex-col justify-center">
              {isComplete ? (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      Your emails have been successfully analyzed! Ready to explore your insights.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={() => setShowDashboard(true)}
                    size="lg"
                    className="w-full"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Your Dashboard
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
                    onClick={() => {
                      setError(null);
                      setSyncTriggered(false);
                      initiateSyncMutation.mutate();
                    }}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              ) : !syncTriggered && !isActiveSyncInProgress ? (
                <div className="space-y-4">
                  <Button 
                    onClick={() => initiateSyncMutation.mutate()}
                    disabled={initiateSyncMutation.isPending}
                    size="lg"
                    className="w-full"
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
                  <Alert>
                    <AlertDescription className="text-sm text-center">
                      We'll analyze your emails to extract transaction data and insights. 
                      This process is secure and typically takes a few minutes.
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
      </div>
    </div>
  );
} 