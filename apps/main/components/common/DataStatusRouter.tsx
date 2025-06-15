'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { SyncInitiator } from './SyncInitiator';

interface DataStatusRouterProps {
  children: React.ReactNode; // Dashboard content for users with data
}

/**
 * Client component that uses server-prefetched data to route users
 * to either the dashboard or sync flow based on their data status.
 */
export function DataStatusRouter({ children }: DataStatusRouterProps) {
  const trpc = useTRPC();
  
  // Use the prefetched data from the server (no additional network call)
  const { data: dataStatus } = useQuery({
    ...trpc.emails.checkDataExists.queryOptions(),
    staleTime: 30000, // 30 seconds
  });
  
  // If user has data, show dashboard
  if (dataStatus?.userState === 'has_data') {
    return <>{children}</>;
  }
  
  // Otherwise, show sync component
  return (
    <div className="container mx-auto px-4 py-8">
      <SyncInitiator />
    </div>
  );
} 