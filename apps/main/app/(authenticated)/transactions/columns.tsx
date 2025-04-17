import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@workspace/ui/components/badge"
import type { Transaction } from "@workspace/database"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "transactionDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    sortingFn: "datetime",
    cell: ({ row }) => {
      return <div>{new Date(row.getValue("transactionDate")).toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      const merchantName = row.original.merchantName
      return (
        <div className="max-w-[400px]">
          <div className="font-medium truncate">{description}</div>
          {merchantName && (
            <div className="text-sm text-muted-foreground truncate">{merchantName}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    sortingFn: "basic",
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number
      const type = row.original.type
      const currency = row.original.currency
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency ?? "INR",
      }).format(Math.abs(amount))

      return (
        <div className={`font-medium ${
          type === "CREDIT" || type === "REFUND" ? "text-green-600" : ""
        }`}>
          {type === "CREDIT" || type === "REFUND" ? "+" : "-"}{formatted}
        </div>
      )
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      return (
        <Badge variant="outline" className="capitalize">
          {type.toLowerCase()}
        </Badge>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    enableSorting: true,
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      return category ? (
        <Badge variant="secondary" className="capitalize">
          {category.toLowerCase().replace("_", " ")}
        </Badge>
      ) : null
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    enableSorting: true,
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge
          variant={
            status === "COMPLETED" ? "default" :
            status === "FAILED" ? "destructive" :
            status === "REFUNDED" ? "outline" :
            "secondary"
          }
          className="capitalize"
        >
          {status.toLowerCase()}
        </Badge>
      )
    },
  },
] 