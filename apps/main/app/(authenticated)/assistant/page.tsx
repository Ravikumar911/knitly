import { prefetch, HydrateClient, trpc } from '@/trpc/server';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { ChatBotNewSession } from '@/components/assistant/chat-bot';
import { Suspense } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';

export const dynamic = 'force-dynamic';

export default async function AssistantPage() {
  await prefetch(trpc.chat.list.queryOptions({ limit: 50 }));

  return (
    <HydrateClient>
      <div className="flex flex-1 min-h-0 -mt-16 h-[calc(100dvh-3.5rem)] flex-col md:flex-row">
        <Suspense fallback={<SidebarSkeleton />}>
          <ChatSidebar />
        </Suspense>
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <ChatBotNewSession />
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
