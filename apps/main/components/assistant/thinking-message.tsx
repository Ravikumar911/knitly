'use client';

import { Loader } from '@workspace/ui/components/ai-elements/loader';
import { Shimmer } from '@workspace/ui/components/ai-elements/shimmer';
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message';

export function ThinkingMessage() {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2 text-muted-foreground text-sm animate-in fade-in-50 duration-300">
          <Loader size={14} />
          <Shimmer duration={1.5}>Analyzing your question...</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

