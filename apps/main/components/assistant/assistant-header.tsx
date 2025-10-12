'use client';

import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { SidebarTrigger } from '@workspace/ui/components/sidebar';
import { Separator } from '@workspace/ui/components/separator';

export function AssistantHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 px-4 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-3 flex-1">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Swiggy Spending Assistant</h1>
          </div>
          <Link href="/assistant">
            <Button variant="default" size="sm">
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

