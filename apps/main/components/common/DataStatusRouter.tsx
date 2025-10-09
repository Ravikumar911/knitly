'use client';

import { useEmailSync } from '@/hooks/useEmailSync';
import { SyncInitiator } from './SyncInitiator';

interface DataStatusRouterProps {
  children: React.ReactNode; // Dashboard content for users with data
}

/**
 * Client component that uses server-prefetched data to route users
 * to either the dashboard or sync flow based on their data status.
 */
export function DataStatusRouter({ children }: DataStatusRouterProps) {
  const { state } = useEmailSync();
  
  // If user has data, show dashboard
  if (state?.state === 'has_data') {
    return <>{children}</>;
  }
  
  // Otherwise, show sync component
  return (
    <div className="container mx-auto px-4 py-8">
      <SyncInitiator />
    </div>
  );
} 