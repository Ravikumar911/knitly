"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import { RouteBreadcrumb } from "@/components/route-breadcrumb";
import { AssistantNewChatButton } from "@/components/assistant/chat-sidebar";

function HeaderControls() {
  return (
    <>
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <div className="min-w-0 flex-1">
        <RouteBreadcrumb />
      </div>
    </>
  );
}

function isAssistantShellPath(pathname: string): boolean {
  if (pathname === "/assistant" || pathname === "/assistant/") {
    return true;
  }
  if (!pathname.startsWith("/assistant/")) {
    return false;
  }
  const rest = pathname.slice("/assistant/".length);
  return rest.length > 0 && !rest.includes("/");
}

export function AuthenticatedInsetHeader() {
  const pathname = usePathname();
  const isAssistant = isAssistantShellPath(pathname);

  if (!isAssistant) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
          <HeaderControls />
        </div>
      </header>
    );
  }

  return (
    <header className="grid h-16 shrink-0 grid-cols-1 border-b md:grid-cols-[auto_1fr] md:items-center">
      <div className="flex min-w-0 items-center gap-2 px-4">
        <HeaderControls />
        <AssistantNewChatButton className="ml-auto md:hidden" />
      </div>
      <div className="hidden h-16 items-center justify-end px-4 md:flex">
        <AssistantNewChatButton />
      </div>
    </header>
  );
}
