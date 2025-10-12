'use client';

import { Sparkles, Brain } from 'lucide-react';

export function ThinkingMessage() {
  return (
    <div className="flex gap-3 group animate-in fade-in duration-200">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-background bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Assistant</span>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Analyzing your question...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

