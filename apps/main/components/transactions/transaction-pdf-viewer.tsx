'use client';

import { useState, useEffect } from 'react';
import { useTRPC } from '@/trpc/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet';
import { Button } from '@workspace/ui/components/button';
import {
  FileText,
  ExternalLink,
  Download,
  AlertCircle,
} from 'lucide-react';

interface TransactionPDFViewerProps {
  transactionId: string;
  onClose: () => void;
}

export function TransactionPDFViewer({ transactionId, onClose }: TransactionPDFViewerProps) {
  const trpc = useTRPC();
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: transaction } = useSuspenseQuery(
    trpc.transactions.getById.queryOptions({
      id: transactionId,
    })
  );

  // Generate signed URL when transaction data is available
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!transaction?.attachmentStoragePath) {
        setPdfUrl(null);
        return;
      }

      try {
        const supabase = createClient();
        const attachmentPaths = parseAttachmentStoragePaths(transaction.attachmentStoragePath);
        
        if (attachmentPaths && attachmentPaths.length > 0) {
          // Get the first PDF attachment (assuming there's at least one)
          const pdfPath = attachmentPaths.find(path => path.toLowerCase().endsWith('.pdf')) || attachmentPaths[0];
          
          if (pdfPath) {
            // Use Supabase storage API to create signed URL with expiry (1 hour)
            const { data, error } = await supabase.storage
              .from('email-attachments')
              .createSignedUrl(pdfPath, 3600); // 1 hour expiry
            
            if (error) {
              console.error('Error creating signed URL:', error);
              setPdfError(`Failed to generate PDF access URL: ${error.message}`);
            } else {
              setPdfUrl(data.signedUrl);
            }
          }
        }
      } catch (err) {
        console.error('Exception in generateSignedUrl:', err);
        setPdfError('Failed to load PDF attachment');
      }
    };

    generateSignedUrl();
  }, [transaction?.attachmentStoragePath]);

  const parseAttachmentStoragePaths = (attachmentStoragePath: any): string[] => {
    if (!attachmentStoragePath) return [];
    
    try {
      if (typeof attachmentStoragePath === 'string') {
        return JSON.parse(attachmentStoragePath);
      }
      if (Array.isArray(attachmentStoragePath)) {
        return attachmentStoragePath;
      }
      return [];
    } catch (error) {
      console.error('Error parsing attachment storage paths:', error);
      return [];
    }
  };

  const renderPDFViewer = () => {
    if (!transaction?.attachmentStoragePath) {
      return (
        <div className="p-6">
          <div className="text-center text-gray-500">
            <FileText className="mx-auto h-12 w-12 mb-4 text-gray-300" />
            <p className="text-sm">No PDF attachment available for this transaction</p>
          </div>
        </div>
      );
    }

    if (pdfError) {
      return (
        <div className="p-6">
          <div className="text-center text-destructive">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-sm">{pdfError}</p>
          </div>
        </div>
      );
    }

    if (!pdfUrl) {
      return (
        <div className="p-6">
          <div className="text-center text-gray-500">
            <FileText className="mx-auto h-12 w-12 mb-4 text-gray-300" />
            <p className="text-sm">PDF URL not available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full">
        <div className="flex flex-row items-center justify-between pb-4">
          <h3 className="text-sm font-medium">Invoice PDF</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(pdfUrl, '_blank')}
              className="text-xs h-7"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = `invoice-${transaction.id}.pdf`;
                link.click();
              }}
              className="text-xs h-7"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
        <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&page=1&zoom=page-width`}
            className="w-full h-full"
            title="Transaction PDF"
            onError={() => setPdfError('Failed to load PDF viewer')}
          />
        </div>
      </div>
    );
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-[90vw] sm:max-w-[800px] p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-lg">Transaction PDF</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-4 pt-0">
            {renderPDFViewer()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 