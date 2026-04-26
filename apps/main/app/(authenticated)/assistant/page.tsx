import { prefetch, HydrateClient, trpc } from '@/trpc/server';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { AssistantNewChatRedirect } from '@/components/assistant/assistant-new-chat-redirect';
import { Suspense } from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';

export const dynamic = 'force-dynamic';

export default async function AssistantPage() {
  await prefetch(trpc.chat.list.queryOptions({ limit: 50 }));

  return (
    <HydrateClient>
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-1 -mt-16 flex-col md:flex-row">
        <Suspense fallback={<SidebarSkeleton />}>
          <ChatSidebar />
        </Suspense>
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <AssistantNewChatRedirect />
        </main>
      </div>
    </HydrateClient>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden shrink-0 flex-col border-r bg-muted/30 md:flex md:w-80">
      <div className="w-full border-b p-3">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex-1 space-y-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </aside>
  );
}
