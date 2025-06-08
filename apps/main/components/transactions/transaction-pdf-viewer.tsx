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
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
        setIsLoading(false);
        setPdfError('No PDF attachment available for this transaction');
        return;
      }

      try {
        setIsLoading(true);
        setPdfError(null);
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
              setIsLoading(false);
            } else {
              setPdfUrl(data.signedUrl);
              setIsLoading(false);
              // Automatically open PDF in new tab
              window.open(data.signedUrl, '_blank');
              // Close the modal after opening PDF
              setTimeout(() => onClose(), 500);
            }
          } else {
            setPdfError('No PDF file found in attachments');
            setIsLoading(false);
          }
        } else {
          setPdfError('No attachment paths found');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Exception in generateSignedUrl:', err);
        setPdfError('Failed to load PDF attachment');
        setIsLoading(false);
      }
    };

    generateSignedUrl();
  }, [transaction?.attachmentStoragePath, onClose]);

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

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `invoice-${transaction?.id}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenAgain = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-8">
          <div className="text-center text-gray-500">
            <FileText className="mx-auto h-12 w-12 mb-4 text-gray-400 animate-pulse" />
            <p className="text-lg font-medium mb-2">Opening PDF...</p>
            <p className="text-sm text-gray-500">Please wait while we load your invoice</p>
          </div>
        </div>
      );
    }

    if (pdfError) {
      return (
        <div className="p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-medium mb-2">Unable to Open PDF</p>
            <p className="text-sm mb-4">{pdfError}</p>
          </div>
        </div>
      );
    }

    // PDF opened successfully
    return (
      <div className="p-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 mb-4 text-green-500" />
          <p className="text-lg font-medium mb-2">PDF Opened Successfully!</p>
          <p className="text-sm text-gray-500 mb-6">
            The invoice PDF has been opened in a new tab. You can also download it or open it again.
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={handleOpenAgain}
              className="text-sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Again
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
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