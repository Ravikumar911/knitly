"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai-elements/message";
import { Loader } from "@workspace/ui/components/ai-elements/loader";
import { Shimmer } from "@workspace/ui/components/ai-elements/shimmer";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { AlertCircle } from "lucide-react";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const allParts = message.parts || [];
  const textParts = allParts.filter((p: any) => p.type === "text");

  // Extract tool parts using modern AI SDK state model (ToolUIPart)
  const toolParts = allParts.filter((p: any) =>
    p.type.startsWith("tool-"),
  ) as any[];

  // Check for errors using the current state model
  const hasError = toolParts.some(
    (p: any) => p.error || p.state === "output-error",
  );
  const errorMessage = toolParts.find(
    (p: any) => p.error || p.state === "output-error",
  );
  const error = errorMessage
    ? errorMessage.error || errorMessage.errorText
    : undefined;

  // Tools are executing when they are in input-available or input-streaming state
  const toolsExecuting = toolParts.some(
    (p: any) => p.state === "input-available" || p.state === "input-streaming",
  );

  // Current tool being executed (for rotating loading messages)
  const currentTool = toolParts.find(
    (p: any) => p.state === "input-available" || p.state === "input-streaming",
  );
  const currentToolType = currentTool?.type;

  // Determine loading text based on tool type.
  // (Rotating analyticsMessages + messageIndex/useEffect removed — tool details are hidden from users;
  // we only surface a simple, stable loading indicator.)
  const getLoadingText = (): string => {
    if (currentToolType?.startsWith("tool-")) {
      return "Analyzing your spending data...";
    }
    return "Thinking...";
  };

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* User message - simple text display */}
        {isUser &&
          textParts.length > 0 &&
          textParts[0] &&
          "text" in textParts[0] && (
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
                  {typeof error === "string"
                    ? error
                    : "Sorry, I encountered an error while processing your request. Please try rephrasing your question."}
                </AlertDescription>
              </Alert>
            )}

            {/* Final Response with Markdown - this comes first for natural flow */}
            {textParts.map((part: any, i: number) => {
              if (!("text" in part)) return null;
              return (
                <MessageResponse
                  key={i}
                  className="prose prose-sm dark:prose-invert max-w-none
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
                  {part.text}
                </MessageResponse>
              );
            })}

            {/* Tool activity is intentionally hidden from users in the first release.
                We only use it internally to drive better loading states below. */}

            {/* Show subtle processing state if no content yet */}
            {!toolsExecuting && !hasError && textParts.length === 0 && (
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
