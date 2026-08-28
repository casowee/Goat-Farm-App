"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  const pathname = usePathname();
  const activeItem = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-surface-border bg-surface px-4 py-3">
      <SidebarTrigger />
      <span className="text-sm font-medium text-copy-primary">
        {activeItem?.label ?? "Goat Farm Manager"}
      </span>
    </header>
  );
}
