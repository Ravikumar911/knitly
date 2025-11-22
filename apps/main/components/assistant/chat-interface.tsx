'use client';

import React, { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageBubble } from './message-bubble';
import { ThinkingMessage } from './thinking-message';
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
}: {
  messages: any[];
  status: any;
  suggestionPrompts: string[];
  handleSubmit: (message: { text: string; files: any[] }, event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}) {
  const { textInput } = usePromptInputController();

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Messages area using AI Elements Conversation */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask me anything about your Swiggy orders and spending habits"
              icon={
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative text-6xl">🍕</div>
                </div>
              }
            >
              <div className="mt-6 w-full max-w-2xl">
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
              
              {/* Thinking indicator - only show when submitted (before streaming starts) */}
              {status === 'submitted' && <ThinkingMessage key="thinking" />}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Fixed input at bottom using AI Elements PromptInput */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              placeholder="Ask about your Swiggy spending..."
              disabled={isLoading}
              autoFocus
            />
            <PromptInputSubmit status={status as any} />
          </PromptInput>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI can make mistakes. Verify important information.
          </p>
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
  } as any);

  const { messages, sendMessage, status } = chatHelpers as any;
  const isLoading = status === 'streaming' || status === 'submitted';

  // 🔍 DEBUG LOGGING - Log messages and status
  useEffect(() => {
    console.log('🔍 ChatInterface Debug:', {
      status,
      isLoading,
      messagesCount: messages.length,
      lastMessage: messages.length > 0 ? {
        id: messages[messages.length - 1].id,
        role: messages[messages.length - 1].role,
        partsCount: messages[messages.length - 1].parts?.length || 0,
        partsTypes: messages[messages.length - 1].parts?.map((p: any) => p.type) || [],
      } : null,
      allMessages: messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        partsCount: msg.parts?.length || 0,
        partsTypes: msg.parts?.map((p: any) => p.type) || [],
      })),
    });
  }, [messages, status, isLoading]);

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
      />
    </PromptInputProvider>
  );
}

