'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Loader2 } from 'lucide-react';
import { SyncInitiator } from './SyncInitiator';
import { Button } from '@workspace/ui/components/button';

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
      // If user needs sync (no initial sync completed), poll every 5 seconds
      // This helps catch when the sync completes
      return data?.needsSync ? 5000 : false;
    },
    refetchOnWindowFocus: true,
    // Reduce stale time for better responsiveness
    staleTime: 2000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Checking your data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error checking your data status</p>
          <div className="space-y-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
            >
              Retry
            </Button>
            <p className="text-sm text-muted-foreground">or refresh the page to try again</p>
          </div>
        </div>
      </div>
    );
  }

  // If user needs sync (no data or no initial sync completed)
  if (dataStatus?.needsSync) {
    return <SyncInitiator />;
  }

  // User has data - show the dashboard
  return <>{children}</>;
} 