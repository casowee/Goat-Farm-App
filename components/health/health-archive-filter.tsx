import Link from "next/link";
import { cn } from "@/lib/utils";
import { HEALTH_RECORD_TYPE_LABELS } from "@/lib/health/records";
import {
  GROUP_ACTIVITIES,
  type GroupActivity,
} from "@/lib/health/group-events";
import type { HealthTab } from "@/components/health/health-tabs";

// UPD-016 amendment (2026-10-04) — the Archive's activity filter: All,
// Deworming, Dip Wash, Vaccination. Plain links carrying `?activity=`, so the
// chosen filter lives in the URL (it survives opening a goat and coming back)
// and the component needs no client JavaScript.

export function HealthArchiveFilter({
  tab,
  active,
}: {
  tab: HealthTab;
  active: GroupActivity | null;
}) {
  const options: { value: GroupActivity | null; label: string }[] = [
    { value: null, label: "All" },
    ...GROUP_ACTIVITIES.map((activity) => ({
      value: activity,
      label: HEALTH_RECORD_TYPE_LABELS[activity],
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2" aria-label="Filter by activity">
      {options.map(({ value, label }) => {
        const isActive = value === active;
        return (
          <Link
            key={label}
            href={`/health?tab=${tab}&view=archive${
              value ? `&activity=${value}` : ""
            }`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "tappable-inline rounded-xl border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-brand text-copy-primary"
                : "border-surface-border text-copy-muted hover:text-copy-secondary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
