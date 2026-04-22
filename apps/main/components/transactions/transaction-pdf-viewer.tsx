'use client';

import { useTRPC } from '@/trpc/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet';
import {
  FileText,
  AlertCircle,
} from 'lucide-react';

interface TransactionPDFViewerProps {
  transactionId: string;
  onClose: () => void;
}

export function TransactionPDFViewer({ transactionId, onClose }: TransactionPDFViewerProps) {
  const trpc = useTRPC();

  const { data: transaction } = useSuspenseQuery(
    trpc.transactions.getById.queryOptions({
      id: transactionId,
    })
  );

  const renderContent = () => {
    if (!transaction?.attachmentStoragePath) {
      return (
        <div className="p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">Unable to Open PDF</p>
            <p className="text-sm mb-4">No invoice attachment is available for this transaction.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full">
        <iframe
          title="Transaction invoice"
          src={`/api/attachments/${transactionId}`}
          className="h-full w-full border-0"
        />
      </div>
    );
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-[90vw] sm:max-w-[500px] p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transaction Invoice
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 
