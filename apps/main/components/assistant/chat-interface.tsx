'use client';

import React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageBubble } from './message-bubble';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@workspace/ui/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputSubmit,
  usePromptInputController,
} from '@workspace/ui/components/ai-elements/prompt-input';
import {
  Suggestions,
  Suggestion,
} from '@workspace/ui/components/ai-elements/suggestion';
import { Card } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { AlertCircle } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  chatId: string;
  initialMessages: any[];
}

function ChatInterfaceContent({
  messages,
  status,
  suggestionPrompts,
  handleSubmit,
  isLoading,
  error,
}: {
  messages: any[];
  status: any;
  suggestionPrompts: string[];
  handleSubmit: (message: { text: string; files: any[] }, event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error?: Error | null;
}) {
  const { textInput } = usePromptInputController();

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Messages area using AI Elements Conversation */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {/* Show error state */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message || 'Something went wrong. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask me anything about your Swiggy orders and spending habits"
              icon={
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                  <div className="relative flex items-center justify-center">
                    <Sparkles className="h-12 w-12 text-primary" />
                  </div>
                </div>
              }
            >
              <div className="mt-8 w-full max-w-2xl animate-in fade-in-50 duration-500">
                <Suggestions>
                  {suggestionPrompts.map((suggestion, i) => (
                    <Suggestion
                      key={i}
                      suggestion={suggestion}
                      onClick={(s) => {
                        textInput.setInput(s);
                      }}
                    />
                  ))}
                </Suggestions>
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((message: any) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Fixed input at bottom using AI Elements PromptInput */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <Card className="border-0 shadow-none bg-transparent">
            <div className="space-y-3">
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputTextarea
                  placeholder="Ask about your Swiggy spending..."
                  disabled={isLoading}
                  autoFocus
                />
                <PromptInputSubmit status={status as any} />
              </PromptInput>
              <p className="text-xs text-muted-foreground text-center">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  // ✅ AI SDK 5.0 useChat with DefaultChatTransport
  const chatHelpers = useChat({
    id: chatId,
    messages: initialMessages,
    experimental_throttle: 100,
    transport: new DefaultChatTransport({
      api: '/api/assistant',
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            chatId,
            message: request.messages.at(-1),
            ...request.body,
          },
        };
      },
    }),
    onError: (error: Error) => {
      console.error('Chat error:', error);
    },
  } as any);

  const { messages, sendMessage, status, error } = chatHelpers as any;
  const isLoading = status === 'streaming' || status === 'submitted';


  const handleSubmit = async (message: { text: string; files: any[] }, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.text.trim() || isLoading) return;

    sendMessage({
      role: 'user',
      parts: [{ type: 'text' as const, text: message.text.trim() }],
    });
  };

  const suggestionPrompts = [
    'How much did I spend on pizza?',
    'What\'s my total Swiggy spending last month?',
    'Show me my top 5 restaurants',
    'Instamart vs food delivery spending?',
  ];

  return (
    <PromptInputProvider>
      <ChatInterfaceContent
        messages={messages}
        status={status}
        suggestionPrompts={suggestionPrompts}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
    </PromptInputProvider>
  );
}

