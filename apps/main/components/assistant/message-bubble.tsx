'use client';

import type { UIMessage } from 'ai';
import { cn } from '@workspace/ui/lib/utils';
import { User, Sparkles, Brain, Search, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import remarkGfm from 'remark-gfm';
import { Task, TaskContent, TaskItem, TaskTrigger } from '@workspace/ui/components/task';

interface MessageBubbleProps {
  message: UIMessage;
}


export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Separate parts by type - AI SDK v5 Agent structure
  const allParts = message.parts || [];
  
  // Handle meaningful parts - exclude step-start as they're just markers
  const toolParts = allParts.filter((p: any) => 
    p.type.startsWith('tool-') || 
    p.type === 'reasoning' ||
    p.type === 'tool-call' ||
    p.type === 'tool-result'
  );
  const textParts = allParts.filter((p: any) => p.type === 'text');
  
  const hasTools = toolParts.length > 0;

  // 🔍 SINGLE COMPREHENSIVE DEBUG LOG - Copy this entire log for debugging
  if (!isUser && hasTools) {
    const debugInfo = {
      MESSAGE_ID: message.id,
      ROLE: message.role,
      TOTAL_PARTS: allParts.length,
      ALL_PARTS_TYPES: allParts.map((p: any, i: number) => `${i}:${p.type}`),
      TOOL_PARTS_DETAILS: toolParts.map((p: any, i: number) => ({
        INDEX: i,
        TYPE: p.type,
        TOOL_NAME: p.type.replace('tool-', ''),
        HAS_RESULT: p.result !== undefined,
        HAS_ERROR: p.error !== undefined,
        RESULT_PREVIEW: p.result ? 'HAS_RESULT' : 'NO_RESULT',
        ERROR_PREVIEW: p.error ? 'HAS_ERROR' : 'NO_ERROR',
      })),
      TEXT_PARTS_COUNT: textParts.length,
      HAS_TOOLS: hasTools,
    };
    console.log('🔍=== SINGLE DEBUG LOG - COPY THIS ===', JSON.stringify(debugInfo, null, 2));
  }

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
      if (toolType === 'tool-executeSQL') return executeSQLMessages[messageIndex] ?? 'Processing your data...';
      return 'Processing...';
    }
    return 'Thinking...';
  };

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-background',
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {isUser ? 'You' : 'Assistant'}
          </span>
        </div>

        {/* User message - simple text display */}
        {isUser && textParts.length > 0 && textParts[0] && 'text' in textParts[0] && (
          <div className="rounded-xl px-4 py-3 bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm">{textParts[0].text}</p>
          </div>
        )}

        {/* Assistant message with thoughtful chain of thought */}
        {!isUser && (
          <div className="space-y-2">
            {/* Show thought process using Task component */}
            {hasTools && textParts.length === 0 && (() => {
              // Group tool parts to avoid duplicates
              const uniqueTools: any[] = [];
              const seenToolCalls = new Set<string>();
              
              toolParts.forEach((toolPart: any, originalIdx: number) => {
                // Generate a stable key for deduplication based on the step type and state
                let toolKey = '';
                if (toolPart.type === 'reasoning') {
                  toolKey = 'reasoning-step';
                } else if (toolPart.type.startsWith('tool-')) {
                  const state = toolPart.state || (toolPart.result ? 'done' : 'pending');
                  toolKey = `${toolPart.type}-${state}`;
                } else if (toolPart.type === 'tool-call') {
                  toolKey = `${toolPart.type}-${toolPart.toolName || 'unknown'}`;
                } else if (toolPart.type === 'tool-result') {
                  toolKey = `${toolPart.type}-${toolPart.toolName || 'unknown'}`;
                } else {
                  const state = toolPart.state || (toolPart.result ? 'done' : 'pending');
                  toolKey = `${toolPart.type}-${state}`;
                }
                
                if (!seenToolCalls.has(toolKey)) {
                  seenToolCalls.add(toolKey);
                  uniqueTools.push(toolPart);
                }
              });
              
              // Create task items from unique tools
              const taskItems = uniqueTools.map((toolPart: any, idx: number) => {
                let toolName = '';
                let hasResult = false;
                let description = '';
                
                if (toolPart.type === 'reasoning') {
                  toolName = 'reasoning';
                  hasResult = toolPart.state === 'done';
                  description = hasResult ? 'Analysis complete' : 'Analyzing results...';
                } else if (toolPart.type.startsWith('tool-')) {
                  toolName = toolPart.type.replace('tool-', '');
                  hasResult = toolPart.state === 'output-available' || toolPart.result !== undefined;
                  if (toolName === 'generateSQL') {
                    description = hasResult ? 'Understood your question' : 'Understanding your question...';
                  } else if (toolName === 'executeSQL') {
                    description = hasResult ? 'Found your data' : 'Looking through your orders...';
                  } else {
                    description = hasResult ? 'Task complete' : 'Processing...';
                  }
                } else if (toolPart.type === 'tool-call') {
                  toolName = toolPart.toolName || 'unknown';
                  hasResult = false;
                  description = 'Processing...';
                } else if (toolPart.type === 'tool-result') {
                  toolName = toolPart.toolName || 'unknown';
                  hasResult = true;
                  description = 'Task complete';
                } else {
                  toolName = toolPart.type;
                  hasResult = toolPart.result !== undefined;
                  description = hasResult ? 'Done' : 'Processing...';
                }
                
                return {
                  key: `${toolPart.type}-${idx}`,
                  description,
                  hasResult,
                  isCurrent: !hasResult
                };
              });
              
              const completedCount = taskItems.filter(item => item.hasResult).length;
              const totalCount = taskItems.length;
              const isComplete = completedCount === totalCount;
              
              return (
                <Task className="w-full">
                  <TaskTrigger 
                    title={`Processing your request ${isComplete ? '(Complete)' : `(${completedCount}/${totalCount})`}`}
                  />
                  <TaskContent>
                    {taskItems.map((item) => (
                      <TaskItem key={item.key}>
                        <div className="flex items-center gap-2">
                          {item.hasResult ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : item.isCurrent ? (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                          )}
                          <span className={item.hasResult ? 'text-emerald-700 dark:text-emerald-300' : ''}>
                            {item.description}
                          </span>
                        </div>
                      </TaskItem>
                    ))}
                  </TaskContent>
                </Task>
              );
            })()}

            {/* Final Response with Enhanced Markdown */}
            {textParts.map((part: any, i: number) => {
              if (!('text' in part)) return null;
              return (
                <div 
                  key={i}
                  className="rounded-xl px-4 py-3 bg-muted/50 border border-border/50 prose prose-sm dark:prose-invert max-w-none
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
                            prose-li:text-foreground"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {part.text}
                  </ReactMarkdown>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
