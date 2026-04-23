'use client';

import { useState } from 'react';
import { ChatInterface } from './chat-interface';

export function NewChatShell() {
  const [chatId] = useState(() => crypto.randomUUID());

  return <ChatInterface chatId={chatId} initialMessages={[]} />;
}
