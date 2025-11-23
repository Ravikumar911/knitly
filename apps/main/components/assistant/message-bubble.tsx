'use client';

import { useState, useEffect } from 'react';
import type { UIMessage } from 'ai';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@workspace/ui/components/ai-elements/message';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@workspace/ui/components/ai-elements/reasoning';
import { Loader } from '@workspace/ui/components/ai-elements/loader';
import { Shimmer } from '@workspace/ui/components/ai-elements/shimmer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import {
  Alert,
  AlertDescription,
} from '@workspace/ui/components/alert';
import { AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: UIMessage;
}

// Helper function to format currency values
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to format numbers
function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-IN');
}

// Helper function to check if a value looks like currency
function isCurrencyField(key: string, value: any): boolean {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('amount') ||
    lowerKey.includes('spend') ||
    lowerKey.includes('total') ||
    lowerKey.includes('price') ||
    lowerKey.includes('fee') ||
    lowerKey.includes('discount') ||
    (typeof value === 'string' && /^\d+\.\d{2}$/.test(value))
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const allParts = message.parts || [];
  const textParts = allParts.filter((p: any) => p.type === 'text');
  
  // Extract tool results silently (for data extraction, not display)
  const toolParts = allParts.filter((p: any) => p.type.startsWith('tool-')) as any[];
  
  // Extract reasoning parts - but we'll hide them to reduce backend complexity
  // Only show if user explicitly wants to see reasoning (collapsed by default)
  const reasoningParts = allParts.filter((p: any) => p.type === 'reasoning') as any[];
  const hasReasoning = reasoningParts.length > 0;
  const isReasoningStreaming = reasoningParts.some((p: any) => p.state !== 'done');
  // Combine all reasoning content into one
  const combinedReasoningContent = reasoningParts
    .map((p: any) => p.content || '')
    .filter(Boolean)
    .join('\n\n');
  
  // Extract SQL results to display inline (but hide the tool execution UI)
  const executeSQLResults = toolParts
    .filter((p: any) => p.type === 'tool-executeSQL' && (p as any).result)
    .map((p: any) => (p as any).result as any)
    .filter((r: any) => r?.success && r?.data && Array.isArray(r.data) && r.data.length > 0);

  // Check for errors
  const hasError = toolParts.some((p: any) => (p as any).error || ((p as any).result && (p as any).result.success === false));
  const errorMessage = toolParts.find((p: any) => (p as any).error || ((p as any).result && (p as any).result.success === false));
  const error = errorMessage ? ((errorMessage as any).error || (errorMessage as any).result?.error) : undefined;

  // Check if tools are still executing and determine which tool
  const toolsExecuting = toolParts.some((p: any) => 
    p.type.startsWith('tool-') && 
    !(p as any).result && 
    !(p as any).error && 
    ((p as any).state === 'input-available' || (p as any).state === 'input-streaming')
  );

  // Get the current executing tool to show specific status
  const currentTool = toolParts.find((p: any) => 
    p.type.startsWith('tool-') && 
    !(p as any).result && 
    !(p as any).error && 
    ((p as any).state === 'input-available' || (p as any).state === 'input-streaming')
  );

  // Rotating messages to keep users engaged during 7-20s wait
  const [messageIndex, setMessageIndex] = useState(0);
  
  const executeSQLMessages = [
    'Analyzing your Swiggy orders...',
    'Crunching through your transactions...',
    'Digging into your spending data...',
    'Almost there, finding insights...',
  ];

  useEffect(() => {
    if (currentTool?.type === 'tool-executeSQL') {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % executeSQLMessages.length);
      }, 3500); // Change message every 3.5s to keep it engaging
      return () => clearInterval(interval);
    }
  }, [currentTool?.type]);

  // Determine loading text based on tool type - make it exciting!
  const getLoadingText = (): string => {
    if (currentTool) {
      const toolType = currentTool.type;
      if (toolType === 'tool-generateSQL') return 'Understanding your question...';
      if (toolType === 'tool-executeSQL') return executeSQLMessages[messageIndex] ?? executeSQLMessages[0] ?? 'Processing...';
      return 'Processing...';
    }
    return 'Thinking...';
  };

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* User message - simple text display */}
        {isUser && textParts.length > 0 && textParts[0] && 'text' in textParts[0] && (
          <MessageResponse>{textParts[0].text}</MessageResponse>
        )}

        {/* Assistant message - simplified, hide backend complexity */}
        {!isUser && (
          <>
            {/* Show loading state when tools are executing */}
            {toolsExecuting && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-1 mb-2">
                <Loader size={14} />
                <Shimmer duration={1.5}>{getLoadingText()}</Shimmer>
              </div>
            )}

            {/* Show error state */}
            {hasError && !toolsExecuting && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {typeof error === 'string' 
                    ? error 
                    : 'Sorry, I encountered an error while processing your request. Please try rephrasing your question.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Final Response with Markdown - this comes first for natural flow */}
            {textParts.map((part: any, i: number) => {
              if (!('text' in part)) return null;
              return (
                <MessageResponse key={i} className="prose prose-sm dark:prose-invert max-w-none
                  prose-headings:font-semibold prose-headings:text-foreground
                  prose-p:text-foreground prose-p:leading-relaxed
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-accent prose-pre:border prose-pre:border-border
                  prose-table:border-collapse prose-table:w-full
                  prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                  prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2
                  prose-ul:list-disc prose-ul:ml-4
                  prose-ol:list-decimal prose-ol:ml-4
                  prose-li:text-foreground">
                  {part.text}
                </MessageResponse>
              );
            })}

            {/* Display SQL results as tables inline (after text for natural flow) */}
            {executeSQLResults.map((result: any, idx: number) => {
              const data = result.data;
              if (!data || !Array.isArray(data) || data.length === 0) return null;

              return (
                <div key={idx} className="my-4 overflow-x-auto rounded-lg border bg-muted/30">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(data[0]).map((key) => (
                          <TableHead key={key} className="font-semibold">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row: any, rowIdx: number) => (
                        <TableRow key={rowIdx}>
                          {Object.keys(data[0]).map((key) => {
                            const value = row[key];
                            const formattedValue = isCurrencyField(key, value)
                              ? formatCurrency(value)
                              : typeof value === 'number'
                                ? formatNumber(value)
                                : String(value ?? '');
                            return (
                              <TableCell key={key}>
                                {formattedValue}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}

            {/* Show subtle processing state if no content yet */}
            {!toolsExecuting && !hasError && textParts.length === 0 && executeSQLResults.length === 0 && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-1">
                <Loader size={14} />
                <Shimmer duration={1.5}>Preparing your insights...</Shimmer>
              </div>
            )}
          </>
        )}
      </MessageContent>
    </Message>
  );
}
