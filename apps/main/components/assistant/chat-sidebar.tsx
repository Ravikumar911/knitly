'use client';

import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { useRouter } from 'next/navigation';
import { TRPCClientError } from '@trpc/client';

export function ChatSidebar() {
  const trpc = useTRPC();
  const pathname = usePathname();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // ✅ Use useMemo for stable query options (following tRPC pattern)
  const queryOptions = useMemo(() => {
    return trpc.chat.list.queryOptions({ limit: 50 });
  }, [trpc.chat.list]);

  const { data } = useSuspenseQuery(queryOptions);

  // ✅ Use useMutation with mutationOptions pattern
  const deleteMutation = useMutation(trpc.chat.delete.mutationOptions({
    onSuccess: () => {
      // Invalidate and refetch chats
      router.refresh();
      if (pathname === `/assistant/${chatToDelete}`) {
        router.push('/assistant');
      }
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        console.error('Failed to delete chat:', err.message);
      } else {
        console.error('An error occurred while deleting chat');
      }
    }
  }));

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
      <aside className="hidden md:flex md:w-80 md:border-r bg-muted/30 flex-col overflow-hidden shrink-0">
        <div className="px-3 py-2.5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-semibold text-sm">Chat History</h2>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 py-1.5 space-y-0.5">
            {data.chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No chats yet</p>
                <p className="text-xs text-muted-foreground">Start a new conversation!</p>
              </div>
            ) : (
              data.chats.map((chat) => {
                const isActive = pathname === `/assistant/${chat.id}`;
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      'group relative rounded-md hover:bg-accent transition-colors',
                      isActive && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2 px-2 py-2">
                      <Link
                        href={`/assistant/${chat.id}`}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm line-clamp-1">{chat.title}</span>
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
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

