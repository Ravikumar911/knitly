'use client';

import { useState } from 'react';
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
  const [pdfError] = useState<string | null>('PDF attachments arrive in Phase 2.');

  const { data: transaction } = useSuspenseQuery(
    trpc.transactions.getById.queryOptions({
      id: transactionId,
    })
  );

  const renderContent = () => {
    if (pdfError) {
      return (
        <div className="p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">Unable to Open PDF</p>
            <p className="text-sm mb-4">{pdfError}</p>
            {transaction?.attachmentStoragePath ? (
              <p className="text-xs text-muted-foreground">This transaction already has attachment metadata.</p>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 mb-4 text-green-500" />
          <p className="text-lg font-medium mb-2">PDF Ready</p>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-[90vw] sm:max-w-[500px] p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-lg">Transaction Invoice</SheetTitle>
          </SheetHeader>

          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 
