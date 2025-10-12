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
      <aside className="w-80 border-r bg-muted/30 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-2 space-y-1">
            {data.chats.length === 0 ? (
              <div className="text-center py-8 px-4 text-sm text-muted-foreground">
                No chats yet. Start a new conversation!
              </div>
            ) : (
              data.chats.map((chat) => {
                const isActive = pathname === `/assistant/${chat.id}`;
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      'group relative flex items-center gap-2 rounded-md p-2 hover:bg-accent transition-colors',
                      isActive && 'bg-accent'
                    )}
                  >
                    <Link
                      href={`/assistant/${chat.id}`}
                      className="flex-1 flex items-center gap-2 min-w-0"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{chat.title}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(chat.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
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

