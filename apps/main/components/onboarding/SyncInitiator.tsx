'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useTRPC } from '@/trpc/client';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Progress } from '@workspace/ui/components/progress';
import { Mail, Zap, BarChart3, Shield, Loader2, CheckCircle, Clock, AlertCircle, LogOut, RefreshCw, Lock } from 'lucide-react';
import { createClient } from '@/supabase/client';
import { useRouter } from 'next/navigation';

export function SyncInitiator() {
  const [error, setError] = useState<string | null>(null);
  const [syncTriggered, setSyncTriggered] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const trpc = useTRPC();
  const router = useRouter();

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

  // Enhanced polling for sync progress with OAuth error detection
  const { data: progressData } = useQuery({
    ...trpc.emails.getSyncProgress.queryOptions(),
    refetchInterval: useCallback((query: { state: { data: any } }) => {
      const data = query.state.data;
      const syncStatus = data?.syncStatus;
      
      const activeSyncStates = ['counting_emails', 'in_progress', 'syncing'];
      const shouldPoll = syncTriggered || (syncStatus && activeSyncStates.includes(syncStatus));
      
      return shouldPoll ? 1000 : false;
    }, [syncTriggered]), // Stable dependency array
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Handle sign out for re-authentication
  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  }, [router]);

  // Determine current sync state
  const syncStatus = progressData?.syncStatus;
  const isInitiating = initiateSyncMutation.isPending;
  const isCountingEmails = syncStatus === 'counting_emails';
  const isInProgress = syncStatus === 'in_progress';
  const isSyncing = syncStatus === 'syncing';
  const hasTotalEmails = progressData?.totalEmails && progressData.totalEmails > 0;
  const isComplete = syncStatus === 'complete';
  const isFailed = syncStatus === 'failed';
  
  // OAuth error detection
  const hasOAuthError = Boolean(progressData?.oauthError);
  const oauthError = progressData?.oauthError;
  const requiresReauth = oauthError?.requiresReauth || false;
  const isPermissionError = oauthError?.type === 'INSUFFICIENT_PERMISSIONS' || oauthError?.type === 'REVOKED_ACCESS';
  
  const isActiveSyncInProgress = isCountingEmails || isInProgress || isSyncing;

  // ✅ FIXED: Move side effect from render to useEffect
  useEffect(() => {
    if (syncTriggered && (isComplete || isFailed)) {
      setSyncTriggered(false);
    }
  }, [syncTriggered, isComplete, isFailed]);

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
    if (syncTriggered && !isActiveSyncInProgress) return 'Initiating Sync Process';
    if (isCountingEmails) return 'Analyzing Your Gmail';
    if (isInProgress) return 'Preparing to Process';
    if (isSyncing) return 'Processing Your Emails';
    return 'Welcome to Slash';
  }, [hasOAuthError, isPermissionError, isComplete, isFailed, isInitiating, syncTriggered, isActiveSyncInProgress, isCountingEmails, isInProgress, isSyncing]);

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
    if (syncTriggered && !isActiveSyncInProgress) return 'Your sync request is being processed...';
    if (isCountingEmails) return 'We\'re counting your emails to estimate processing time...';
    if (isInProgress) return 'Getting everything ready to process your emails...';
    if (isSyncing) return 'Analyzing your emails for transaction data...';
    return 'Let\'s analyze your Gmail to discover your financial transactions and spending patterns.';
  }, [hasOAuthError, isPermissionError, isComplete, isFailed, isInitiating, syncTriggered, isActiveSyncInProgress, isCountingEmails, isInProgress, isSyncing]);

  // Format time remaining
  const formatTimeRemaining = useCallback((estimatedCompletion: Date) => {
    const now = new Date();
    const remaining = estimatedCompletion.getTime() - now.getTime();
    const minutes = Math.ceil(remaining / (1000 * 60));
    
    if (minutes <= 0) return 'Almost done...';
    if (minutes === 1) return 'About 1 minute remaining';
    return `About ${minutes} minutes remaining`;
  }, []);

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
                  disabled={isSigningOut}
                  className="flex items-center gap-2"
                  size="lg"
                  aria-label={isSigningOut ? 'Signing out...' : 'Sign out and try again'}
                >
                  {isSigningOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {isSigningOut ? 'Signing Out...' : 'Sign Out & Try Again'}
                </Button>
                
                {!requiresReauth && (
                  <Button 
                    variant="outline" 
                    onClick={() => initiateSyncMutation.mutate()}
                    disabled={isInitiating}
                    className="flex items-center gap-2"
                    aria-label="Retry sync"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Sync
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Progress Section - Always reserve space */}
          {!hasOAuthError && (
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
                      {formatTimeRemaining(new Date(progressData.estimatedCompletion))}
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
            </div>
          )}

          {/* Error Section */}
          {error && !hasOAuthError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {!hasOAuthError && !isActiveSyncInProgress && !isComplete && (
            <div className="flex flex-col gap-4">
              <Button 
                onClick={() => initiateSyncMutation.mutate()}
                disabled={isInitiating}
                size="lg"
                className="w-full"
              >
                {isInitiating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Starting Analysis...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <span>Start Email Analysis</span>
                  </div>
                )}
              </Button>

              {/* Benefits Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Mail className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm">Smart Email Analysis</h3>
                    <p className="text-xs text-muted-foreground">Automatically finds transaction emails</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm">Spending Insights</h3>
                    <p className="text-xs text-muted-foreground">Track patterns and trends</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Shield className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm">Secure & Private</h3>
                    <p className="text-xs text-muted-foreground">Your data stays protected</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completion Actions */}
          {isComplete && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  🎉 Your emails have been successfully analyzed!
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                  You can now explore your financial insights and transaction history.
                </p>
              </div>
              <Button 
                onClick={() => router.push('/dashboard')}
                size="lg"
                className="w-full"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                View Your Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 