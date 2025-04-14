import { Metadata } from "next"
import { TransactionsDataTable } from "./data-table"
import { prefetch, HydrateClient, trpc } from "@/trpc/server"
import { Suspense } from 'react';
export const metadata: Metadata = {
  title: "Transactions",
  description: "View and manage your transactions",
}

export default function TransactionsPage() {

  prefetch(trpc.transactions.list.queryOptions({
    pageSize: 10,
    page: 1,
  }))
  return (
    <HydrateClient>
      <div className="flex flex-col gap-4 p-4">
        
        <Suspense fallback={<div>Loading...</div>}>
          <TransactionsDataTable />
        </Suspense>
      </div>
    </HydrateClient>
  )
} 