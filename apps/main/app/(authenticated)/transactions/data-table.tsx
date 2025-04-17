"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { DataTable } from "@/components/data-table/data-table"
import { useTRPC } from "@/trpc/client"
import { columns } from "./columns"
import { TransactionFilters } from "./filters"
import type { Table, SortingState } from "@tanstack/react-table"
import type { Transaction } from "@workspace/database"
import { useTransactionFilters } from "@/store/transaction-filters"

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
  
  // Define initial sorting state (newest transactions first)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "transactionDate", desc: true }
  ])
  
  // Use transaction filters from Zustand store
  const { type, category, startDate, endDate, amountMin, amountMax } = useTransactionFilters()

  const trpc = useTRPC()
  
  // Convert sorting state to API parameters
  const sortParams = React.useMemo(() => {
    if (!sorting.length) {
      return { 
        sortBy: 'transactionDate' as const, 
        sortDirection: 'desc' as const 
      }
    }
    
    const primarySort = sorting[0]
    if (!primarySort) {
      return { 
        sortBy: 'transactionDate' as const, 
        sortDirection: 'desc' as const 
      }
    }
    
    return {
      sortBy: primarySort.id,
      sortDirection: primarySort.desc ? 'desc' as const : 'asc' as const,
    }
  }, [sorting])

  // API query with filters from Zustand store and sorting
  const { data: rawData, isLoading, isError, error } = useQuery(trpc.transactions.list.queryOptions({
    page: pagination.pageIndex + 1, // Convert to 1-based for API
    pageSize: pagination.pageSize,
    type,
    category,
    startDate,
    endDate,
    amountMin,
    amountMax,
    ...sortParams,
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

  // Handle sort change
  const handleSortingChange = React.useCallback((newSorting: SortingState) => {
    setSorting(newSorting)
  }, [])

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
      {tableInstance && <TransactionFilters table={tableInstance} />}
      <DataTable
        columns={columns}
        data={data?.transactions ?? []}
        pageCount={data?.pageCount ?? 0}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPaginationChange={handlePaginationChange}
        totalCount={data?.totalCount ?? 0}
        isLoading={isLoading}
        filterComponent={null}
        onTableMount={setTableInstance}
        initialSorting={sorting}
        onSortingChange={handleSortingChange}
      />
    </div>
  )
} 