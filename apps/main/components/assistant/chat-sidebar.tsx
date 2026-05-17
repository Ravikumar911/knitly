"use client";

import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResolvedPathname } from "@/lib/assistant/resolved-pathname";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { MessageSquare, MessageSquarePlus, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { TRPCClientError } from "@trpc/client";

export function AssistantNewChatButton({
  className,
}: {
  className?: string;
}) {
  return (
    <Button
      asChild
      className={cn("h-8 shrink-0", className)}
      size="sm"
      variant="default"
    >
      <Link
        href="/assistant"
        className="inline-flex items-center justify-center gap-0"
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0" />
        <span className="ml-1.5">New chat</span>
      </Link>
    </Button>
  );
}

/** Top strip when the sidebar shows its own row (non-merged layout). */
export function AssistantChatSidebarToolbar() {
  return (
    <div className="flex w-full justify-end">
      <AssistantNewChatButton />
    </div>
  );
}

export function ChatSidebar({ hideTitleRow = false }: { hideTitleRow?: boolean }) {
  const trpc = useTRPC();
  const pathname = useResolvedPathname();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // ✅ Use useMemo for stable query options (following tRPC pattern)
  const queryOptions = useMemo(() => {
    return trpc.chat.list.queryOptions({ limit: 50 });
  }, [trpc.chat.list]);

  const { data } = useSuspenseQuery(queryOptions);

  // ✅ Use useMutation with mutationOptions pattern
  const deleteMutation = useMutation(
    trpc.chat.delete.mutationOptions({
      onSuccess: () => {
        // Invalidate and refetch chats
        router.refresh();
        if (pathname === `/assistant/${chatToDelete}`) {
          router.push("/assistant");
        }
      },
      onError: (err) => {
        if (err instanceof TRPCClientError) {
          console.error("Failed to delete chat:", err.message);
        } else {
          console.error("An error occurred while deleting chat");
        }
      },
    }),
  );

  const handleDelete = (chatId: string) => {
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (chatToDelete) {
      await deleteMutation.mutateAsync({ chatId: chatToDelete });
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  return (
    <>
      <aside className="hidden h-full min-h-0 shrink-0 flex-col overflow-hidden bg-muted/30 md:flex md:w-80 md:border-r">
        {!hideTitleRow ? (
          <div className="shrink-0 border-b px-3 py-2.5">
            <AssistantChatSidebarToolbar />
          </div>
        ) : null}
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 py-1.5 space-y-0.5">
            {data.chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  No chats yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Start a new conversation!
                </p>
              </div>
            ) : (
              data.chats.map((chat) => {
                const isActive = pathname === `/assistant/${chat.id}`;
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      "group relative rounded-md hover:bg-accent transition-colors",
                      isActive && "bg-accent",
                    )}
                  >
                    <div className="flex items-center gap-2 px-2 py-2">
                      <Link
                        href={`/assistant/${chat.id}`}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm line-clamp-1">
                          {chat.title}
                        </span>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(chat.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete chat</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
