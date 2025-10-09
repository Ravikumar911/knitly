'use client';

import { useEmailSync } from '@/hooks/useEmailSync';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Progress } from '@workspace/ui/components/progress';
import { Mail, Zap, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export function ManualSyncCard() {
  const { state, isLoading, cta, error } = useEmailSync();

  // Determine current sync state
  const isCountingEmails = state?.phase === 'counting_emails';
  const isInProgress = state?.phase === 'in_progress';
  const isSyncing = state?.phase === 'syncing';
  const hasTotalEmails = !!state?.progress.total && (state.progress.total || 0) > 0;
  const isComplete = state?.phase === 'complete';
  const isFailed = state?.phase === 'failed';
  
  const isActiveSyncInProgress = isCountingEmails || isInProgress || isSyncing;

  const getStatusIcon = () => {
    if (isComplete) return <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500" />;
    if (isFailed) return <AlertCircle className="h-6 w-6 text-destructive" />;
    if (isActiveSyncInProgress || isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    return <RefreshCw className="h-6 w-6 text-primary" />;
  };

  const getStatusTitle = () => {
    if (isComplete) return 'Sync Complete!';
    if (isFailed) return 'Sync Failed';
    if (isLoading) return 'Starting Email Sync';
    if (isCountingEmails) return 'Analyzing Your Gmail';
    if (isInProgress) return 'Preparing to Process';
    if (isSyncing) return 'Processing Your Emails';
    return 'Manual Email Sync';
  };

  const getStatusDescription = () => {
    if (isComplete) return 'Your emails have been successfully synced and updated!';
    if (isFailed) return 'Email sync failed. Please try starting the sync again.';
    if (isLoading) return 'Initializing the sync process...';
    if (isCountingEmails) return 'Analyzing your Gmail account for new emails';
    if (isInProgress) return 'Preparing to process your emails...';
    if (isSyncing) return 'Processing emails in the background. You can safely navigate away from this page.';
    return 'Manually sync your emails to update your transaction data with the latest information';
  };

  const formatTimeRemaining = (estimatedCompletion: Date | null) => {
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
        {/* Last Sync Information (not available via unified state) */}

        {/* Progress Section - Only show during sync */}
        {(isActiveSyncInProgress || isComplete) && (
          <div className="space-y-4">
            {/* Progress Bar */}
            {hasTotalEmails && state && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {state.progress.processed.toLocaleString()} of {(state.progress.total || 0).toLocaleString()} emails processed
                  </span>
                  <span className="font-medium">
                    {Math.round(state.progress.percent || 0)}%
                  </span>
                </div>
                <Progress 
                  value={state.progress.percent || 0} 
                  className="h-3"
                />
              </div>
            )}

            {/* Time Remaining */}
            {state?.progress?.eta && !isComplete && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTimeRemaining(state.progress.eta as any)}
              </div>
            )}

            {/* Email Count Display */}
            {hasTotalEmails && !isComplete && (
              <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  Found {(state?.progress.total ?? 0).toLocaleString()} emails to process
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
                onClick={() => cta?.action?.()}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {cta?.label || 'Sync Again'}
              </Button>
            </div>
          ) : isFailed ? (
            <div className="space-y-4">
              <Button 
                onClick={() => cta?.action?.()}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {cta?.label || 'Try Again'}
              </Button>
            </div>
          ) : !isActiveSyncInProgress ? (
            <div className="space-y-4">
              <Button 
                onClick={() => cta?.action?.()}
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting Sync...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {cta?.label || 'Start Email Sync'}
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
              {typeof (error as any)?.message === 'string' 
                ? (error as any).message 
                : 'An error occurred while fetching sync state'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 