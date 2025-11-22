'use client';

import { Loader } from '@workspace/ui/components/ai-elements/loader';
import { Message, MessageContent } from '@workspace/ui/components/ai-elements/message';

export function ThinkingMessage() {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader size={16} />
          <span>Analyzing your question...</span>
        </div>
      </MessageContent>
    </Message>
  );
}

