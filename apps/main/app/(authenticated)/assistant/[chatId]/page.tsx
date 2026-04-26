import { redirect } from "next/navigation";
import { prefetch, HydrateClient, trpc } from "@/trpc/server";
import { getChatById, LOCAL_USER_ID } from "@workspace/database";
import { ChatBot } from "@/components/assistant/chat-bot";
import { ChatSidebar } from "@/components/assistant/chat-sidebar";
import { Suspense } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { UIMessage } from "ai";
import { z } from "zod";

export const dynamic = "force-dynamic";

const chatIdSchema = z.string().uuid();

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  if (!chatIdSchema.safeParse(chatId).success) {
    redirect("/assistant");
  }

  const chat = await getChatById(chatId, LOCAL_USER_ID);

  await prefetch(trpc.chat.list.queryOptions({ limit: 50 }));

  const initialMessages: UIMessage[] = chat
    ? chat.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        parts: msg.parts,
        createdAt: msg.createdAt,
      }))
    : [];

  return (
    <HydrateClient>
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-1 -mt-16 flex-col md:flex-row">
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
