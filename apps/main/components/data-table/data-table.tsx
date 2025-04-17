import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Table,
  type OnChangeFn,
  type Updater,
} from "@tanstack/react-table"

import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination"

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  pageCount: number
  pageSize: number
  pageIndex: number
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  totalCount: number
  isLoading?: boolean
  filterComponent?: React.ReactNode
  onTableMount?: (table: Table<TData>) => void
  initialSorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
}

export function DataTable<TData>({
  columns,
  data,
  pageCount,
  pageSize,
  pageIndex,
  onPaginationChange,
  totalCount,
  isLoading,
  filterComponent,
  onTableMount,
  initialSorting = [],
  onSortingChange,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  
  // Handle sorting changes and notify parent component
  const handleSortingChange = React.useCallback((
    updaterOrValue: Updater<SortingState>
  ) => {
    // Pass through the updater to setSorting
    setSorting(updaterOrValue)
    
    // If it's a function, we need to compute the new value to pass to onSortingChange
    if (typeof updaterOrValue === 'function') {
      const newSorting = updaterOrValue(sorting)
      onSortingChange?.(newSorting)
    } else {
      // If it's a direct value, pass it along
      onSortingChange?.(updaterOrValue)
    }
  }, [sorting, onSortingChange])

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
  })

  React.useEffect(() => {
    onTableMount?.(table)
  }, [table, onTableMount])

  // Update sorting state if initialSorting changes
  React.useEffect(() => {
    if (initialSorting.length > 0) {
      setSorting(initialSorting)
    }
  }, [initialSorting])

  const handlePageChange = (newPageIndex: number) => {
    onPaginationChange({ pageIndex: newPageIndex, pageSize })
  }

  return (
    <div className="space-y-4">
      {filterComponent}
      <div className="rounded-md border">
        <UITable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </UITable>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {totalCount} total items
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  if (pageIndex > 0) {
                    handlePageChange(pageIndex - 1)
                  }
                }}
                aria-disabled={pageIndex === 0}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .slice(
                Math.max(0, pageIndex - 2),
                Math.min(pageCount, pageIndex + 3)
              )
              .map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault()
                      handlePageChange(pageNum - 1)
                    }}
                    isActive={pageIndex === pageNum - 1}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ))}
            {pageIndex < pageCount - 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  if (pageIndex < pageCount - 1) {
                    handlePageChange(pageIndex + 1)
                  }
                }}
                aria-disabled={pageIndex === pageCount - 1}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
} 