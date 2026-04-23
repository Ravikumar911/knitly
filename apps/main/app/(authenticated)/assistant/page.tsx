import { prefetch, HydrateClient, trpc } from '@/trpc/server';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { AssistantHeader } from '@/components/assistant/assistant-header';
import { NewChatShell } from '@/components/assistant/new-chat-shell';
import { Suspense } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';

export const dynamic = 'force-dynamic';

export default async function AssistantPage() {
  await prefetch(trpc.chat.list.queryOptions({ limit: 50 }));

  return (
    <HydrateClient>
      <div className="flex flex-col min-h-screen -mt-16">
        <AssistantHeader />
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          <Suspense fallback={<SidebarSkeleton />}>
            <ChatSidebar />
          </Suspense>
          <main className="flex-1 flex flex-col min-w-0 w-full">
            <NewChatShell />
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
