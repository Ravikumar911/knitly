'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { TRPCClientError } from '@trpc/client';
import { useSyncStore } from '@/hooks/useSyncStore';
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
  const queryClient = useQueryClient();
  
  // Use store without selectors to avoid hydration issues
  const syncStore = useSyncStore();
  const { 
    isInitiating, 
    error, 
    oauthError, 
    totalEmails, 
    processedEmails, 
    progressPercentage, 
    estimatedCompletion, 
    syncStatus,
    updateSyncProgress, 
    startPolling, 
    setInitiating, 
    setError, 
    clearError 
  } = syncStore;

  // Mutation to start sync
  const initiateSyncMutation = useMutation(trpc.emails.initiateSync.mutationOptions({
    onMutate: () => {
      setInitiating(true);
      clearError();
    },
    onSuccess: () => {
      // Don't immediately set initiating to false
      // Keep it true until we detect the background process has started
      // The background process will update syncStatus which we'll detect below
      
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

  // Handle transition from initiating to background processing
  useEffect(() => {
    // If we're initiating and detect that background processing has started,
    // we can stop showing the "initiating" state
    if (isInitiating && syncStatus && ['counting_emails', 'in_progress', 'syncing'].includes(syncStatus)) {
      setInitiating(false);
    }
    
    // Also clear initiating state if sync completes or fails
    if (isInitiating && syncStatus && ['complete', 'failed'].includes(syncStatus)) {
      setInitiating(false);
    }
  }, [isInitiating, syncStatus, setInitiating]);

  // If we land on the page while a sync is already active, start polling
  useEffect(() => {
    if (syncStatus && ['counting_emails', 'in_progress', 'syncing'].includes(syncStatus)) {
      startPolling(() => {
        refetchProgress();
      });
    }
  }, [syncStatus, startPolling, refetchProgress]);

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
  
  // Updated to include initiating state
  const isActiveSyncInProgress = isInitiating || isCountingEmails || isInProgress || isSyncing;

  // Helper functions for status display (messages from backend)
  const getStatusIcon = useCallback(() => {
    if (hasOAuthError) return <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />;
    if (isComplete) return <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />;
    if (isFailed) return <AlertCircle className="h-8 w-8 text-destructive" />;
    if (isActiveSyncInProgress) return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
    return <Zap className="h-8 w-8 text-primary" />;
  }, [hasOAuthError, isComplete, isFailed, isActiveSyncInProgress]);

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

  // When sync completes, invalidate data status so router flips to dashboard
  useEffect(() => {
    if (isComplete) {
      const key = trpc.emails.checkDataExists.queryOptions().queryKey;
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [isComplete, queryClient, trpc.emails.checkDataExists]);

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {progressData?.message?.title || ''}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            {progressData?.message?.description || ''}
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

          {/* Progress Section - text comes from backend */}
          {isActiveSyncInProgress && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progressData?.message?.progressText}</span>
                {estimatedCompletion && !isInitiating && (
                  <span className="text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatTimeRemaining(estimatedCompletion)}
                  </span>
                )}
              </div>
              <Progress 
                value={isInitiating ? 0 : (progressPercentage || 0)} 
                className="w-full h-2"
              />
              {!isInitiating && progressPercentage > 0 && (
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