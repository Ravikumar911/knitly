'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Progress } from '@workspace/ui/components/progress';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

export function SyncProgressTracker() {
  const [isComplete, setIsComplete] = useState(false);
  const trpc = useTRPC();

  // Poll for sync progress every 3 seconds
  const { data: progress, isLoading, error } = useQuery({
    ...trpc.emails.getSyncProgress.queryOptions(),
    refetchInterval: isComplete ? false : 3000, // Stop polling when complete
    refetchIntervalInBackground: true,
  });

  // Check if sync is complete
  useEffect(() => {
    if (progress?.syncStatus === 'complete' && progress?.hasInitialSync) {
      setIsComplete(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.reload(); // This will trigger DataStatusChecker to show dashboard
      }, 3000);
    }
  }, [progress]);

  if (isLoading && !progress) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading progress...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load sync progress. Please refresh the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  const getStatusIcon = () => {
    switch (progress.syncStatus) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.syncStatus) {
      case 'complete':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-primary';
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={getStatusColor()}>
            {progress.syncStatus === 'complete' ? 'Sync Complete!' : 'Syncing Your Emails'}
          </span>
        </CardTitle>
        <CardDescription>
          {progress.statusMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              {progress.processedEmails?.toLocaleString() || 0} of {progress.totalEmails?.toLocaleString() || 0} emails processed
            </span>
            <span className={getStatusColor()}>
              {Math.round(progress.progressPercentage || 0)}%
            </span>
          </div>
          <Progress 
            value={progress.progressPercentage || 0} 
            className="h-3"
          />
        </div>

        {/* Time Remaining */}
        {progress.estimatedCompletion && progress.syncStatus !== 'complete' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTimeRemaining(progress.estimatedCompletion)}
          </div>
        )}

        {/* Status Messages */}
        {progress.syncStatus === 'complete' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your emails have been successfully analyzed! Redirecting to your dashboard...
            </AlertDescription>
          </Alert>
        )}

        {progress.syncStatus === 'failed' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Email sync failed. Please try again or contact support if the issue persists.
            </AlertDescription>
          </Alert>
        )}

        {/* Processing Status */}
        {progress.syncStatus === 'syncing' && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Processing emails in the background. You can safely close this page and return later.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 