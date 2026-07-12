import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@workspace/ui/components/sidebar";
import { AuthenticatedInsetHeader } from "@/components/authenticated-inset-header";
import { getLocalProfileIdentity, LOCAL_USER_ID } from "@workspace/database";
import { isOnboardComplete } from "@/lib/onboard/complete";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isOnboardComplete())) {
    redirect("/onboard");
  }

  const profile = await getLocalProfileIdentity(LOCAL_USER_ID);

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          avatar: "",
          email: profile.email || "local@slash.cash",
          name: profile.name,
        }}
      />
      <SidebarInset className="h-svh max-h-svh min-h-0 flex flex-col overflow-hidden md:h-[calc(100svh-1rem)] md:max-h-[calc(100svh-1rem)]">
        <AuthenticatedInsetHeader />
        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
