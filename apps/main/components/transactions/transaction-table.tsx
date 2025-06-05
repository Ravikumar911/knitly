'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useTRPC } from '@/trpc/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { TransactionPDFViewer } from './transaction-pdf-viewer';

// Type representing the serialized transaction data from tRPC (dates become strings)
type TransactionFromTRPC = {
  id: string;
  userId: string;
  parsedEmailId: string | null;
  merchantId: string | null;
  merchantCode: string | null;
  merchantName: string | null;
  amount: string;
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
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  const trpc = useTRPC();

  // Create query options without any filters
  const queryOptions = useMemo(() => {
    return trpc.transactions.list.queryOptions({
      page,
      pageSize,
      filters: {}, // Empty filters object
    });
  }, [trpc.transactions.list, page, pageSize]);

  // Fetch transactions using proper tRPC pattern
  const { data } = useSuspenseQuery(queryOptions);

  const formatCurrency = (amount: string, currency: string = 'INR') => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    }).format(numAmount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'DEBIT' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-green-100 text-green-800';
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
                <TableHead className="h-8 text-xs font-medium">Date</TableHead>
                <TableHead className="h-8 text-xs font-medium">Merchant</TableHead>
                <TableHead className="h-8 text-xs font-medium">Description</TableHead>
                <TableHead className="h-8 text-xs font-medium">Amount</TableHead>
                <TableHead className="h-8 text-xs font-medium">Type</TableHead>
                <TableHead className="h-8 text-xs font-medium">Status</TableHead>
                <TableHead className="h-8 text-xs font-medium">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.transactions || []).map((transaction) => {
                const t = transaction as TransactionFromTRPC;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="py-2 text-xs">
                      {format(new Date(t.transactionDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="py-2">
                      <div>
                        <div className="font-medium text-xs">
                          {t.merchantName || 'Unknown'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="max-w-xs truncate text-xs" title={t.description || ''}>
                        {t.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="font-medium text-xs">
                        {formatCurrency(t.amount, t.currency || 'INR')}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={`${getTypeColor(t.type)} text-xs px-1 py-0`}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={`${getStatusColor(t.status || '')} text-xs px-1 py-0`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      {t.attachmentStoragePath ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransaction(t.id)}
                          className="h-6 w-6 p-0"
                        >
                          <FileText className="h-3 w-3" />
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
            {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.pagination.totalCount)} of {data.pagination.totalCount}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!data.pagination?.hasPrev}
              className="h-6 px-2 text-xs"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs px-2">
              {page}/{data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!data.pagination?.hasNext}
              className="h-6 px-2 text-xs"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {selectedTransaction && (
        <Suspense fallback={<div>Loading...</div>}>
          <TransactionPDFViewer
            transactionId={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default TransactionTableContent;

// Named export for backwards compatibility
export { TransactionTableContent as TransactionTable }; 