"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { DataTable } from "@/components/data-table/data-table"
import { useTRPC } from "@/trpc/client"
import { columns } from "./columns"
import { TransactionFilters } from "./filters"
import type { Table } from "@tanstack/react-table"
import type { Transaction } from "@workspace/database"

// Type for raw transaction data from API before date conversion
type RawTransaction = Omit<Transaction, 'createdAt' | 'updatedAt' | 'transactionDate' | 'valueDate'> & {
  createdAt: string
  updatedAt: string
  transactionDate: string
  valueDate: string | null
}

export function TransactionsDataTable() {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [tableInstance, setTableInstance] = React.useState<Table<Transaction>>()

  const trpc = useTRPC()

  // Get filter values from table instance
  const filters = React.useMemo(() => ({
    status: (tableInstance?.getColumn("status")?.getFilterValue() as string | undefined)?.toUpperCase() as any || undefined,
    search: (tableInstance?.getColumn("description")?.getFilterValue() as string) || undefined,
  }), [tableInstance])

  const { data: rawData, isLoading, isError, error } = useQuery(trpc.transactions.list.queryOptions({
    page: pagination.pageIndex + 1, // Convert to 1-based for API
    pageSize: pagination.pageSize,
    ...filters,
  }))

  // Convert string dates to Date objects and ensure all required fields are present
  const data = React.useMemo(() => {
    if (!rawData) return undefined
    return {
      ...rawData,
      transactions: (rawData.transactions as RawTransaction[]).map(transaction => ({
        ...transaction,
        createdAt: new Date(transaction.createdAt),
        updatedAt: new Date(transaction.updatedAt),
        transactionDate: new Date(transaction.transactionDate),
        valueDate: transaction.valueDate ? new Date(transaction.valueDate) : null,
        paymentMethod: transaction.paymentMethod ?? null,
        isVerified: transaction.isVerified ?? null,
      })) as Transaction[],
    }
  }, [rawData])

  // Handle pagination changes
  const handlePaginationChange = React.useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }, [])

  if (isError) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-destructive">
        Error loading transactions: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data?.transactions ?? []}
        pageCount={data?.pageCount ?? 0}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPaginationChange={handlePaginationChange}
        totalCount={data?.totalCount ?? 0}
        isLoading={isLoading}
        filterComponent={tableInstance && <TransactionFilters table={tableInstance} />}
        onTableMount={setTableInstance}
      />
    </div>
  )
} 