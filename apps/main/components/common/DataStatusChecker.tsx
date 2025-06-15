'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { useSyncStore, selectSyncState } from '@/hooks/useSyncStore';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SyncInitiator } from '../onboarding/SyncInitiator';
import { ErrorDisplay } from './ErrorDisplay';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';

interface DataStatusCheckerProps {
  children: React.ReactNode; // Dashboard content for users with data
}

export function DataStatusChecker({ children }: DataStatusCheckerProps) {
  const trpc = useTRPC();
  const { userState, isLoading, error, oauthError, currentError } = useSyncStore(selectSyncState);
  const { updateDataStatus, setLoading, setNetworkError, clearError } = useSyncStore();

  // Query to check if user has data
  const { data: dataStatus, isLoading: isCheckingData, error: dataError, refetch } = useQuery({
    ...trpc.emails.checkDataExists.queryOptions(),
    retry: 2,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Update Zustand store when data status changes
  useEffect(() => {
    if (dataStatus) {
      updateDataStatus({
        userState: dataStatus.userState,
        hasEmails: dataStatus.hasEmails,
        emailCount: dataStatus.emailCount,
        hasInitialSync: dataStatus.hasInitialSync,
        syncStatus: dataStatus.syncStatus,
        oauthError: dataStatus.oauthError,
      });
    }
  }, [dataStatus, updateDataStatus]);

  // Handle loading state
  useEffect(() => {
    setLoading(isCheckingData);
  }, [isCheckingData, setLoading]);

  // Handle network errors
  useEffect(() => {
    if (dataError) {
      setNetworkError(`Unable to check your data: ${dataError.message}`);
    } else {
      clearError();
    }
  }, [dataError, setNetworkError, clearError]);

  // Show loading spinner while checking data (only for first load)
  if (isCheckingData && !dataStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Checking your data...</p>
      </div>
    );
  }

  // Show error if we can't check data status
  if (dataError && !dataStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Load</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">We couldn't check your account status. Please try again.</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-3 w-3 mr-1" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show generic error from store
  if (currentError?.type === 'network') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ErrorDisplay 
          onRetry={() => refetch()}
          className="max-w-md"
        />
      </div>
    );
  }

  // Route based on user state
  switch (userState) {
    case 'has_data':
      // User has successfully synced data - show dashboard
      return <>{children}</>;

    case 'new_user':
    case 'oauth_error':
    case 'sync_failed':
    case 'sync_in_progress':
      // User needs to go through sync process
      return (
        <div className="container mx-auto px-4 py-8">
          <SyncInitiator />
        </div>
      );

    default:
      // Fallback - show sync initiator
      return (
        <div className="container mx-auto px-4 py-8">
          <SyncInitiator />
        </div>
      );
  }
} 