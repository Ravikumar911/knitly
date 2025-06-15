'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { TRPCClientError } from '@trpc/client';
import { useSyncStore, selectSyncState, selectSyncProgress } from '@/hooks/useSyncStore';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Progress } from '@workspace/ui/components/progress';
import { Mail, Zap, BarChart3, Shield, Loader2, CheckCircle, Clock, AlertCircle, LogOut, RefreshCw, Lock } from 'lucide-react';
import { createClient } from '@/supabase/client';
import { useRouter } from 'next/navigation';

export function SyncInitiator() {
  const trpc = useTRPC();
  const router = useRouter();
  
  const { isInitiating, error, oauthError } = useSyncStore(selectSyncState);
  const { totalEmails, processedEmails, progressPercentage, estimatedCompletion, syncStatus } = useSyncStore(selectSyncProgress);
  const { updateSyncProgress, startPolling, setInitiating, setError, clearError } = useSyncStore();

  // Mutation to start sync
  const initiateSyncMutation = useMutation(trpc.emails.initiateSync.mutationOptions({
    onMutate: () => {
      setInitiating(true);
      clearError();
    },
    onSuccess: () => {
      setInitiating(false);
      // Start polling for progress after sync is initiated
      startPolling(() => {
        refetchProgress();
      });
    },
    onError: (err) => {
      setInitiating(false);
      if (err instanceof TRPCClientError) {
        setError(err.message || "Failed to start email analysis");
      } else {
        setError("An error occurred while starting email analysis");
      }
    }
  }));

  // Enhanced polling for sync progress with OAuth error detection
  const { data: progressData, refetch: refetchProgress } = useQuery({
    ...trpc.emails.getSyncProgress.queryOptions(),
    refetchInterval: false, // We'll handle polling manually through Zustand
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Update Zustand store when progress data changes
  useEffect(() => {
    if (progressData) {
      updateSyncProgress({
        totalEmails: progressData.totalEmails,
        processedEmails: progressData.processedEmails,
        progressPercentage: progressData.progressPercentage,
        estimatedCompletion: progressData.estimatedCompletion ? new Date(progressData.estimatedCompletion) : null,
        syncStatus: progressData.syncStatus,
        oauthError: progressData.oauthError,
      });
    }
  }, [progressData, updateSyncProgress]);

  // Handle sign out for re-authentication
  const handleSignOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

  // Determine current sync state
  const isCountingEmails = syncStatus === 'counting_emails';
  const isInProgress = syncStatus === 'in_progress';
  const isSyncing = syncStatus === 'syncing';
  const hasTotalEmails = totalEmails && totalEmails > 0;
  const isComplete = syncStatus === 'complete';
  const isFailed = syncStatus === 'failed';
  
  // OAuth error detection
  const hasOAuthError = Boolean(oauthError);
  const requiresReauth = oauthError?.requiresReauth || false;
  const isPermissionError = oauthError?.type === 'INSUFFICIENT_PERMISSIONS' || oauthError?.type === 'REVOKED_ACCESS';
  
  const isActiveSyncInProgress = isCountingEmails || isInProgress || isSyncing;

  // Helper functions for status display
  const getStatusIcon = useCallback(() => {
    if (hasOAuthError) return <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />;
    if (isComplete) return <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />;
    if (isFailed) return <AlertCircle className="h-8 w-8 text-destructive" />;
    return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
  }, [hasOAuthError, isComplete, isFailed]);

  const getStatusTitle = useCallback(() => {
    if (hasOAuthError && isPermissionError) return 'Gmail Permission Required';
    if (hasOAuthError) return 'Authentication Issue';
    if (isComplete) return 'Sync Complete!';
    if (isFailed) return 'Sync Failed';
    if (isInitiating) return 'Starting Email Analysis';
    if (isCountingEmails) return 'Analyzing Your Gmail';
    if (isInProgress) return 'Preparing to Process';
    if (isSyncing) return 'Processing Your Emails';
    return 'Welcome to Slash';
  }, [hasOAuthError, isPermissionError, isComplete, isFailed, isInitiating, isCountingEmails, isInProgress, isSyncing]);

  const getStatusDescription = useCallback(() => {
    if (hasOAuthError && isPermissionError) {
      return 'We need access to your Gmail to analyze your transactions. Please sign in again and grant the necessary permissions.';
    }
    if (hasOAuthError) {
      return 'There was an issue with your Google account connection. Please sign in again to continue.';
    }
    if (isComplete) return 'Your emails have been successfully analyzed and imported.';
    if (isFailed && !hasOAuthError) return 'Something went wrong during the sync process. Please try again.';
    if (isInitiating) return 'Setting up the email analysis process...';
    if (isCountingEmails) return 'We\'re counting your emails to estimate processing time...';
    if (isInProgress) return 'Getting everything ready to process your emails...';
    if (isSyncing) return 'Analyzing your emails for transaction data...';
    return 'Let\'s analyze your Gmail to discover your financial transactions and spending patterns.';
  }, [hasOAuthError, isPermissionError, isComplete, isFailed, isInitiating, isCountingEmails, isInProgress, isSyncing]);

  // Format time remaining
  const formatTimeRemaining = useCallback((estimatedCompletion: Date) => {
    const now = new Date();
    const remaining = estimatedCompletion.getTime() - now.getTime();
    const minutes = Math.ceil(remaining / (1000 * 60));
    
    if (minutes <= 0) return 'Almost done...';
    if (minutes === 1) return 'About 1 minute remaining';
    return `About ${minutes} minutes remaining`;
  }, []);

  const handleInitiateSync = useCallback(() => {
    initiateSyncMutation.mutate();
  }, [initiateSyncMutation]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {getStatusTitle()}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* OAuth Permission Error Section */}
          {hasOAuthError && (
            <div className="space-y-4">
              <Alert variant={isPermissionError ? "default" : "destructive"} className={isPermissionError ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950" : ""}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <div className="font-medium">
                    {oauthError?.userFriendlyMessage || 'Authentication error occurred'}
                  </div>
                  
                  {isPermissionError && (
                    <div className="text-sm space-y-2">
                      <p>To continue, you&apos;ll need to:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Sign out and sign in again</li>
                        <li>Make sure to click &quot;Allow&quot; when Google asks for Gmail permissions</li>
                        <li>Grant access to read your Gmail messages</li>
                      </ul>
                      <p className="text-muted-foreground italic">
                        Don&apos;t worry - we only read transaction-related emails and never access personal messages.
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                  size="lg"
                  aria-label="Sign out and try again"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out & Try Again
                </Button>
                
                {!requiresReauth && (
                  <Button 
                    onClick={handleInitiateSync}
                    variant="outline"
                    className="flex items-center gap-2"
                    size="lg"
                    disabled={isInitiating}
                    aria-label="Retry sync"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Sync
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Sync Error Section */}
          {error && !hasOAuthError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Section */}
          {isActiveSyncInProgress && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {hasTotalEmails 
                    ? `${processedEmails} of ${totalEmails} emails processed`
                    : `${processedEmails} emails processed`
                  }
                </span>
                {estimatedCompletion && (
                  <span className="text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatTimeRemaining(estimatedCompletion)}
                  </span>
                )}
              </div>
              <Progress 
                value={progressPercentage || 0} 
                className="w-full h-2"
              />
              {progressPercentage > 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}% complete
                </div>
              )}
            </div>
          )}

          {/* Action Section */}
          {!hasOAuthError && !isActiveSyncInProgress && !isComplete && (
            <div className="space-y-4">
              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-sm">Analyze Gmail transactions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-sm">Automatic categorization</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-sm">Spending insights</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm">Privacy protected</span>
                </div>
              </div>

              <Button 
                onClick={handleInitiateSync}
                disabled={isInitiating}
                size="lg"
                className="w-full h-12 text-base font-medium"
                aria-label={isInitiating ? 'Starting sync...' : 'Start analyzing your emails'}
              >
                {isInitiating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Analysis...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start Email Analysis
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Success Section */}
          {isComplete && (
            <div className="text-center space-y-4">
              <p className="text-green-600 dark:text-green-400 font-medium">
                🎉 Analysis complete! You can now explore your financial insights.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                size="lg"
                className="w-full"
              >
                View Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 