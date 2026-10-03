import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomTabBar } from "@/components/nav/bottom-tab-bar";
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
        {/* Spec 18.2 (§4E) — on a phone the page ends above the floating tab
            bar, so the last row, Show more and save buttons are never under it. */}
        <main className="flex-1 max-md:tab-bar-clearance">{children}</main>
      </div>
      {/* Spec 18.2 — phone-only tab bar. Mounted here, inside the signed-in
          shell, so the login and offline pages never get one. */}
      <BottomTabBar />
    </SidebarProvider>
  );
}
