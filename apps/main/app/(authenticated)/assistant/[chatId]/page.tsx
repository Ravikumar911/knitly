import { redirect } from 'next/navigation';
import { prefetch, HydrateClient, trpc } from '@/trpc/server';
import { getChatById, LOCAL_USER_ID } from '@workspace/database';
import { ChatInterface } from '@/components/assistant/chat-interface';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { AssistantHeader } from '@/components/assistant/assistant-header';
import { Suspense } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';
import type { UIMessage } from '@ai-sdk/react';

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
      <div className="flex flex-col min-h-screen -mt-16">
        <AssistantHeader />
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          <Suspense fallback={<SidebarSkeleton />}>
            <ChatSidebar />
          </Suspense>
          <main className="flex-1 flex flex-col min-w-0 w-full">
            <ChatInterface chatId={chatId} initialMessages={initialMessages} />
          </main>
        </div>
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
