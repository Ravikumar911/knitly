'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Progress } from '@workspace/ui/components/progress';
import { Mail, Zap, BarChart3, Shield, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { useEmailSync } from '@/hooks/useEmailSync';

export function SyncInitiator() {
  const router = useRouter();
  const { state, isLoading, statusLabel, statusDescription, cta, refetch } = useEmailSync();

  // FIX Issue #6: Auto-navigate to dashboard when sync completes
  useEffect(() => {
    if (state?.phase === 'complete' && state?.state === 'has_data') {
      const timer = setTimeout(async () => {
        await refetch(); // Ensure latest state
        router.refresh(); // Server-side refetch
        router.push('/dashboard'); // Navigate to dashboard
      }, 2000); // 2 second delay to show success message

      return () => clearTimeout(timer);
    }
  }, [state?.phase, state?.state, router, refetch]);

  const isCountingEmails = state?.phase === 'counting_emails';
  const isInProgress = state?.phase === 'in_progress';
  const isSyncing = state?.phase === 'syncing';
  const isComplete = state?.phase === 'complete';
  const isFailed = state?.phase === 'failed';
  const requiresReauth = state?.oauth?.requiresReauth || false;
  const isActiveSyncInProgress = isCountingEmails || isInProgress || isSyncing;

  const getStatusIcon = () => {
    if (requiresReauth) return <Lock className="h-8 w-8 text-amber-600 dark:text-amber-500" />;
    if (isComplete) return <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />;
    if (isFailed) return <AlertCircle className="h-8 w-8 text-destructive" />;
    if (isActiveSyncInProgress || isLoading) return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
    return <Zap className="h-8 w-8 text-primary" />;
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {statusLabel || 'Email Sync'}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            {statusDescription || "Let's analyze your Gmail to discover your transactions and spending patterns."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isActiveSyncInProgress && state?.progress.total ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {state.progress.processed} of {state.progress.total} emails processed
                </span>
                {state.progress.eta && (
                  <span className="text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {new Date(state.progress.eta).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <Progress 
                value={state.progress.percent} 
                className="w-full h-2"
              />
              {state.progress.percent > 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  {Math.round(state.progress.percent)}% complete
                </div>
              )}
            </div>
          ) : null}

          {isComplete ? (
            <div className="text-center space-y-4">
              <p className="text-green-600 dark:text-green-400 font-medium">
                🎉 Analysis complete! You can now explore your financial insights.
              </p>
              <Button 
                onClick={async () => {
                  // Force refetch to ensure state is updated with hasInitialSync: true
                  await refetch();
                  // Small delay to ensure state propagates
                  await new Promise(resolve => setTimeout(resolve, 100));
                  router.refresh();
                  router.push('/dashboard');
                }}
                size="lg"
                className="w-full"
              >
                View Dashboard
              </Button>
            </div>
          ) : cta ? (
            <div className="space-y-4">
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
                onClick={() => cta.action()}
                size="lg"
                className="w-full h-12 text-base font-medium"
              >
                {requiresReauth ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    {cta.label}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {cta.label}
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}