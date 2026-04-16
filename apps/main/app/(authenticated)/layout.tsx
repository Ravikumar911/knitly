import { redirect } from 'next/navigation';

import { createClient } from '@/supabase/server';
import { SidebarProvider } from '@workspace/ui/components/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset } from '@workspace/ui/components/sidebar';
import { SidebarTrigger } from '@workspace/ui/components/sidebar';
import { Separator } from '@workspace/ui/components/separator';
import { RouteBreadcrumb } from '@/components/route-breadcrumb';
import { LOCAL_MODE, LOCAL_USER } from '@/lib/local-mode';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: any = {
    id: LOCAL_USER.id,
    email: LOCAL_USER.email,
    user_metadata: {
      avatar_url: LOCAL_USER.avatar,
      name: LOCAL_USER.name,
    },
  };

  if (!LOCAL_MODE) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      redirect('/login');
    }

    user = data.user;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={{avatar: user.user_metadata.avatar_url, email: user.email ?? '', name: user.user_metadata.name}} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <RouteBreadcrumb />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
