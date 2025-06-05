'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Loader2 } from 'lucide-react';
import { SyncInitiator } from './SyncInitiator';

interface DataStatusCheckerProps {
  children: React.ReactNode; // Dashboard content for users with data
}

export function DataStatusChecker({ children }: DataStatusCheckerProps) {
  const trpc = useTRPC();

  // Check if user has any synced data
  const { data: dataStatus, isLoading, error } = useQuery(
    trpc.emails.checkDataExists.queryOptions()
  );

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
        <div className="text-center space-y-2">
          <p className="text-red-600">Error checking your data status</p>
          <p className="text-sm text-muted-foreground">Please refresh the page to try again</p>
        </div>
      </div>
    );
  }

  // If user needs sync (no data or no initial sync completed)
  if (dataStatus?.needsSync) {
    return <SyncInitiator dataStatus={dataStatus} />;
  }

  // User has data - show the dashboard
  return <>{children}</>;
} 