'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SyncInitiator } from './SyncInitiator';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';

interface DataStatusCheckerProps {
  children: React.ReactNode; // Dashboard content for users with data
}

export function DataStatusChecker({ children }: DataStatusCheckerProps) {
  const trpc = useTRPC();

  // Check if user has any synced data with more frequent polling during onboarding
  const { data: dataStatus, isLoading, error, refetch } = useQuery({
    ...trpc.emails.checkDataExists.queryOptions(),
    // Poll more frequently to catch completion of initial sync
    refetchInterval: (query) => {
      const data = query.state.data;
      // Only poll if sync is in progress, not for new users or those with errors
      return data?.userState === 'sync_in_progress' ? 5000 : false;
    },
    refetchOnWindowFocus: true,
    // Reduce stale time for better responsiveness
    staleTime: 2000,
  });

  // Show loading only when actually loading data, not for new users
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Checking your account...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              We couldn't check your account status. Please check your internet connection and try again.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <p className="text-sm text-muted-foreground">or refresh the page to try again</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle different user states
  if (dataStatus) {
    switch (dataStatus.userState) {
      case 'has_data':
        // User has successfully synced data - show dashboard
        return <>{children}</>;
        
      case 'oauth_error':
        // User has OAuth permission errors - show error with reauth option
        return (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4 max-w-md">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Permission Required</AlertTitle>
                <AlertDescription>
                  {dataStatus.oauthError?.userFriendlyMessage || 
                   "You need to grant permission to access your Gmail. Please sign in again and allow email access."}
                </AlertDescription>
              </Alert>
              <SyncInitiator />
            </div>
          </div>
        );
        
      case 'sync_failed':
        // User has failed sync (non-OAuth) - show error with retry option
        return (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4 max-w-md">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sync Failed</AlertTitle>
                <AlertDescription>
                  Something went wrong during your email sync. Don't worry, you can try again.
                </AlertDescription>
              </Alert>
              <SyncInitiator />
            </div>
          </div>
        );
        
      case 'sync_in_progress':
        // User has sync in progress - show sync initiator with progress
        return <SyncInitiator />;
        
      case 'new_user':
      default:
        // New user or needs sync - show sync initiator without loading state
        return <SyncInitiator />;
    }
  }

  // Fallback - should not reach here
  return <SyncInitiator />;
} 