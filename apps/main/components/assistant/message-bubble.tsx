'use client';

import type { UIMessage } from 'ai';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@workspace/ui/components/ai-elements/message';
import {
  Tool,
  ToolHeader,
  ToolContent,
} from '@workspace/ui/components/ai-elements/tool';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@workspace/ui/components/ai-elements/reasoning';

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

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* User message - simple text display */}
        {isUser && textParts.length > 0 && textParts[0] && 'text' in textParts[0] && (
          <MessageResponse>{textParts[0].text}</MessageResponse>
        )}

        {/* Assistant message with tools and reasoning */}
        {!isUser && (
          <>
            {/* Show reasoning and tool calls */}
            {toolParts.map((toolPart: any, idx: number) => {
              if (toolPart.type === 'reasoning') {
                return (
                  <Reasoning
                    key={`reasoning-${idx}`}
                    isStreaming={toolPart.state !== 'done'}
                    defaultOpen={true}
                  >
                    <ReasoningTrigger />
                    <ReasoningContent>
                      {toolPart.content || ''}
                    </ReasoningContent>
                  </Reasoning>
                );
              } else if (toolPart.type.startsWith('tool-')) {
                const toolName = toolPart.type.replace('tool-', '');
                const state = toolPart.state || (toolPart.result ? 'output-available' : 'input-available');
                
                return (
                  <Tool key={`tool-${idx}`} defaultOpen={state === 'output-available'}>
                    <ToolHeader
                      title={toolName === 'generateSQL' ? 'Understanding your question' : toolName === 'executeSQL' ? 'Looking through your orders' : toolName}
                      type={toolPart.type as any}
                      state={state as any}
                    />
                    <ToolContent>
                      {toolPart.result && (
                        <MessageResponse>
                          {typeof toolPart.result === 'string' 
                            ? toolPart.result 
                            : JSON.stringify(toolPart.result, null, 2)}
                        </MessageResponse>
                      )}
                      {toolPart.error && (
                        <div className="text-destructive text-sm">
                          Error: {toolPart.error}
                        </div>
                      )}
                    </ToolContent>
                  </Tool>
                );
              }
              return null;
            })}

            {/* Final Response with Markdown */}
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
          </>
        )}
      </MessageContent>
    </Message>
  );
}
