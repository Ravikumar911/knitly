import { Suspense } from 'react';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { Skeleton } from '@workspace/ui/components/skeleton';

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Suspense 
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        }
      >
        <TransactionTable />
      </Suspense>
    </div>
  );
} 