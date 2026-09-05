"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Route-backed tabs for the Breeding area (UPD-012 amendment). Each tab is its
// own URL so it survives navigating into a record and back, per the project's
// "navigable view state lives in the URL" convention. Settings stays a corner
// button, not a tab.
const BREEDING_TABS = [
  { href: "/breeding", label: "Seasons" },
  { href: "/breeding/doe-performance", label: "Doe Performance" },
] as const;

export function BreedingTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-surface-border">
      {BREEDING_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand text-copy-primary"
                : "border-transparent text-copy-muted hover:text-copy-secondary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
