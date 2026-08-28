import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: the proxy (proxy.ts) already redirects unauthenticated
  // requests, this is the server-side check for routes rendered under this layout.
  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider className="bg-base">
      <AppSidebar />
      <div className="flex min-h-svh flex-1 flex-col bg-base">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}
