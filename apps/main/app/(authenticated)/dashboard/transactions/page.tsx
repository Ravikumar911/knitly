import { Suspense } from "react";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { prefetch, HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  // Prefetch transactions data on the server
  prefetch(
    trpc.transactions.list.queryOptions({
      page: 1,
      pageSize: 10,
      filters: {
        sortBy: "date",
        sortOrder: "desc", // Default to newest first
      },
    }),
  );

  return (
    <HydrateClient>
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
    </HydrateClient>
  );
}
