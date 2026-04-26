import { redirect } from 'next/navigation';
import { prefetch, HydrateClient, trpc } from '@/trpc/server';
import { getChatById, LOCAL_USER_ID } from '@workspace/database';
import { ChatBot } from '@/components/assistant/chat-bot';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { Suspense } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';
import type { UIMessage } from "ai";

export const dynamic = 'force-dynamic';

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;
  const chat = await getChatById(chatId, LOCAL_USER_ID);

  if (!chat) {
    redirect('/assistant');
  }

  // Prefetch chat list
  await prefetch(trpc.chat.list.queryOptions({ limit: 50 }));

  // Convert database messages to UIMessage format
  const initialMessages: UIMessage[] = chat.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    parts: msg.parts,
    createdAt: msg.createdAt,
  }));

  return (
    <HydrateClient>
      <div className="flex flex-1 min-h-0 -mt-16 h-[calc(100dvh-3.5rem)] flex-col md:flex-row">
        <Suspense fallback={<SidebarSkeleton />}>
          <ChatSidebar />
        </Suspense>
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <ChatBot chatId={chatId} initialMessages={initialMessages} />
        </main>
      </div>
    </HydrateClient>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex md:w-80 md:border-r bg-muted/30 flex-col">
      <div className="p-3 border-b w-full">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="p-2 space-y-1 flex-1 w-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </aside>
  );
}
