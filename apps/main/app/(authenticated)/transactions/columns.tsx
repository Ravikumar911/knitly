import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@workspace/ui/components/badge"
import type { Transaction } from "@workspace/database"

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "transactionDate",
    header: "Date",
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
    header: "Amount",
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
    accessorKey: "category",
    header: "Category",
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
    header: "Status",
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