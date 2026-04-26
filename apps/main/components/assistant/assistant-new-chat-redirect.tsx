"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@workspace/ui/components/skeleton";

/**
 * `/assistant` entry: reserve a stable chat id in the URL before the first message (row created on first stream).
 */
export function AssistantNewChatRedirect() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace(`/assistant/${crypto.randomUUID()}`);
  }, [router]);

  return (
    <div className="flex flex-1 flex-col gap-3 p-6">
      <Skeleton className="mx-auto h-8 w-48" />
      <Skeleton className="mx-auto h-4 w-64" />
    </div>
  );
}
