import { redirect } from 'next/navigation';
import { createClient } from '@/supabase/server';
import { prefetch, HydrateClient, trpc } from '@/trpc/server';
import { ChatInterface } from '@/components/assistant/chat-interface';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { AssistantHeader } from '@/components/assistant/assistant-header';
import { randomUUID } from 'crypto';
import { Suspense } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';

function generateUUID(): string {
  return randomUUID();
}

export default async function AssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Prefetch chat list
  await prefetch(trpc.chat.list.queryOptions({ limit: 50 }));

  const newChatId = generateUUID();

  return (
    <HydrateClient>
      <div className="flex flex-col h-screen -mt-16">
        <AssistantHeader />
        <div className="flex flex-1 min-h-0">
          <Suspense fallback={<SidebarSkeleton />}>
            <ChatSidebar />
          </Suspense>
          <main className="flex-1 flex flex-col min-w-0">
            <ChatInterface chatId={newChatId} initialMessages={[]} />
          </main>
        </div>
      </div>
    </HydrateClient>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="w-80 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="p-2 space-y-1 flex-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </aside>
  );
}

