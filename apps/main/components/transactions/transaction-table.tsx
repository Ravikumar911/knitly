"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { TransactionPDFViewer } from "./transaction-pdf-viewer";

// Type representing the serialized transaction data from tRPC (dates become strings)
type TransactionFromTRPC = {
  id: string;
  userId: string;
  parsedEmailId: string | null;
  merchantId: string | null;
  merchantCode: string | null;
  merchantName: string | null;
  amount: string | number;
  currency: string | null;
  type: string;
  status: string | null;
  transactionDate: string; // Date serialized as string
  description: string | null;
  category: string | null;
  paymentMethod: string | null;
  referenceIds: any;
  location: any;
  merchantData: any;
  extractionConfidence: number | null;
  schemaUsed: string | null;
  dataSource: string | null;
  isVerified: boolean | null;
  verificationStatus: string | null;
  duplicateOf: string | null;
  createdAt: string; // Date serialized as string
  updatedAt: string; // Date serialized as string
  // Email data
  emailId: string | null;
  emailSubject: string | null;
  emailSnippet: string | null;
  emailThreadId: string | null;
  attachmentStoragePath: any;
  emailReceivedDate: string | null; // Date serialized as string
};

// Main transaction table component
function TransactionTableContent() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const trpc = useTRPC();

  // Create query options with sorting
  const queryOptions = useMemo(() => {
    return trpc.transactions.list.queryOptions({
      page,
      pageSize,
      filters: {
        sortBy: "date",
        sortOrder: sortDirection,
      },
    });
  }, [trpc.transactions.list, page, pageSize, sortDirection]);

  // Fetch transactions using proper tRPC pattern
  const { data } = useSuspenseQuery(queryOptions);

  // Toggle sort direction
  const handleSortToggle = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const formatCurrency = (
    amount: string | number,
    currency: string = "INR",
  ) => {
    const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(numAmount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800";
      case "FAILED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "CANCELLED":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "DEBIT"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-chart-1/10 text-chart-1 border-chart-1/20";
  };

  if (!data || data.transactions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600 text-sm border rounded">
        No transactions found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table without Card wrapper */}
      <div className="border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="h-9 text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 -ml-2 font-medium text-sm"
                    onClick={handleSortToggle}
                  >
                    Date
                    {sortDirection === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="h-9 text-sm font-medium">
                  Merchant
                </TableHead>
                <TableHead className="h-9 text-sm font-medium">
                  Description
                </TableHead>
                <TableHead className="h-9 text-sm font-medium">
                  Amount
                </TableHead>
                <TableHead className="h-9 text-sm font-medium">Type</TableHead>
                <TableHead className="h-9 text-sm font-medium">
                  Status
                </TableHead>
                <TableHead className="h-9 text-sm font-medium">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.transactions || []).map((transaction) => {
                const t = transaction as TransactionFromTRPC;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="py-2.5 text-xs">
                      {format(new Date(t.transactionDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div>
                        <div className="font-medium text-xs">
                          {t.merchantName || "Unknown"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div
                        className="max-w-xs truncate text-xs"
                        title={t.description || ""}
                      >
                        {t.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="font-medium text-xs">
                        {formatCurrency(t.amount, t.currency || "INR")}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        className={`${getTypeColor(t.type)} text-xs px-1.5 py-0.5`}
                      >
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        className={`${getStatusColor(t.status || "")} text-xs px-1.5 py-0.5`}
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      {t.attachmentStoragePath ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransaction(t.id)}
                          className="h-7 w-7 p-0"
                          aria-label={`Open invoice for ${t.description || t.merchantName || "this transaction"}`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-xs">No PDF</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-3 rounded border">
          <div className="text-xs text-gray-600">
            {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, data.pagination.totalCount)} of{" "}
            {data.pagination.totalCount}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.pagination?.hasPrev}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs px-2">
              {page}/{data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.pagination?.hasNext}
              className="h-7 px-2 text-xs"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {selectedTransaction && (
        <TransactionPDFViewer
          transactionId={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

export default TransactionTableContent;

// Named export for backwards compatibility
export { TransactionTableContent as TransactionTable };
