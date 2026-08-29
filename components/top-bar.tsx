"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { navItems } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * The top bar is rendered once by the app layout (`app/(app)/layout.tsx`), so
 * pages can't pass props into it directly. Instead it exposes two optional
 * slots that any page can fill by rendering `<TopBarSlot>` / `<TopBarBackButton>`
 * from within its own tree — the content is portalled into the header.
 *
 * - `lead`  — just after the sidebar trigger, before the title. For a back
 *   button on drill-down pages (UPD-006). The dashboard omits it — it's the
 *   home page, nothing to go back to — but the slot exists for future pages.
 * - `trail` — the far right. For the barn filter and an action icon.
 *
 * Slots that no page fills render nothing.
 */

const LEAD_SLOT_ID = "top-bar-slot-lead";
const TRAIL_SLOT_ID = "top-bar-slot-trail";

export function TopBar() {
  const pathname = usePathname();
  const activeItem = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-surface-border bg-surface px-4 py-3">
      <SidebarTrigger />
      <span id={LEAD_SLOT_ID} className="flex items-center empty:hidden" />
      <span className="text-sm font-medium text-copy-primary">
        {activeItem?.label ?? "Goat Farm Manager"}
      </span>
      <span
        id={TRAIL_SLOT_ID}
        className="ml-auto flex items-center gap-2 empty:hidden"
      />
    </header>
  );
}

// The slot elements are static and always present once the header mounts, so
// there's nothing to subscribe to — the store just reports the current node.
const noopSubscribe = () => () => {};

function useSlotNode(target: "lead" | "trail"): HTMLElement | null {
  const id = target === "lead" ? LEAD_SLOT_ID : TRAIL_SLOT_ID;
  return useSyncExternalStore(
    noopSubscribe,
    () => document.getElementById(id),
    () => null,
  );
}

/**
 * Portals its children into one of the top bar's slots. Render it anywhere in a
 * page's tree. Renders nothing on the server; on the client the target already
 * exists in the hydrated DOM, so there's no mismatch and no post-mount flash.
 */
export function TopBarSlot({
  target = "trail",
  children,
}: {
  target?: "lead" | "trail";
  children: ReactNode;
}) {
  const node = useSlotNode(target);
  return node ? createPortal(children, node) : null;
}

/**
 * A back link in the top bar's lead slot, for pages reached from elsewhere.
 * The dashboard does not use this — future drill-down pages will.
 */
export function TopBarBackButton({
  href,
  label = "Back",
}: {
  href: string;
  label?: string;
}) {
  return (
    <TopBarSlot target="lead">
      <Button
        render={<Link href={href} aria-label={label} />}
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </TopBarSlot>
  );
}
