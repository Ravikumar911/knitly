'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import { ThinkingMessage } from './thinking-message';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

interface ChatInterfaceProps {
  chatId: string;
  initialMessages: any[];
}

export function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    sendMessage({
      role: 'user',
      parts: [{ type: 'text' as const, text: userMessage }],
    });
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Messages area - Scrollable with flex-1 */}
      <div className="flex-1 overflow-y-auto min-h-0" ref={scrollAreaRef}>
        <div className="px-4 py-6 max-w-4xl mx-auto h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative text-6xl">🍕</div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Start a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask me anything about your Swiggy orders and spending habits
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  'How much did I spend on pizza?',
                  'What\'s my total Swiggy spending last month?',
                  'Show me my top 5 restaurants',
                  'Instamart vs food delivery spending?',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="text-left px-4 py-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-colors text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message: any) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {/* Thinking indicator - only show when submitted (before streaming starts) */}
              {status === 'submitted' && <ThinkingMessage key="thinking" />}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Fixed input at bottom */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your Swiggy spending..."
              disabled={isLoading}
              className={cn(
                "flex-1 border-border/50 focus-visible:border-primary/50 transition-colors",
                isLoading && "opacity-50"
              )}
              autoFocus
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

