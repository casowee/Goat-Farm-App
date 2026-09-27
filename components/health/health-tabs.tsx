import Link from "next/link";
import { cn } from "@/lib/utils";

// UPD-016 — the two tabs of the `/health` page. Both live on the same route,
// distinguished by `?tab=`, because they read the same table and neither needs
// its own URL segment the way the Breeding area's three pages do. Query-param
// state, not `useState`, so the tab survives opening a goat and coming back —
// the project's "navigable view state lives in the URL" convention, same as
// `/goats?view=duplicates`.
//
// The active tab arrives as a prop from the page rather than being read here
// with `useSearchParams`, which keeps this a plain server component (two links
// and a border) and keeps the route's `loading.tsx` free of a search-param
// dependency it cannot satisfy.
//
// Switching tabs deliberately drops the other tab's params (the History
// filters, the Schedule lookahead): each tab owns its own view state, and a
// stale `?window=` sitting in the URL while History is showing would be a lie.

export type HealthTab = "history" | "schedule";

const TABS: { tab: HealthTab; label: string }[] = [
  { tab: "history", label: "History" },
  { tab: "schedule", label: "Schedule" },
];

/** Narrow a `?tab=` value; anything unrecognised falls back to History. */
export function parseHealthTab(value: string | undefined): HealthTab {
  return value === "schedule" ? "schedule" : "history";
}

export function HealthTabs({ active }: { active: HealthTab }) {
  return (
    <div className="flex gap-1 border-b border-surface-border">
      {TABS.map(({ tab, label }) => {
        const isActive = tab === active;
        return (
          <Link
            key={tab}
            href={`/health?tab=${tab}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "tappable -mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-brand text-copy-primary"
                : "border-transparent text-copy-muted hover:text-copy-secondary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
