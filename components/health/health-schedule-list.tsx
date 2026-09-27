import { Badge } from "@/components/ui/badge";
import { GoatLink } from "@/components/goats/goat-link";
import { HEALTH_RECORD_TYPE_LABELS } from "@/lib/health/records";
import type { DueSoonItem } from "@/lib/dashboard/due-soon";

// UPD-016 (§5) — the Schedule tab's list: every upcoming (or overdue) health
// follow-up across the whole herd, soonest first.
//
// The items arrive already computed by the shared `dueSoon()` in
// `lib/dashboard/due-soon.ts` — the same function behind the dashboard's Due
// soon widget, called with a wider `windowDays`. This component only renders,
// so the two views can never disagree about what is due.
//
// Server-rendered; the goat reference is the shared `GoatLink`, as in the
// Breeding lists.

function relativeLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function HealthScheduleList({
  items,
  windowDays,
}: {
  items: DueSoonItem[];
  windowDays: number;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        Nothing due in the next {windowDays} days. Anything with a “next due
        date” on a goat’s Health tab — vaccination, deworming, dip wash or
        checkup — shows up here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={`${item.goatId}-${item.recordType}-${item.dueDate}-${index}`}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-subtle px-3 py-3"
        >
          <GoatLink
            goat={{ id: item.goatId, tag: item.goatTag, name: item.goatName }}
            className="text-sm font-medium"
          />
          <Badge variant="outline">
            {HEALTH_RECORD_TYPE_LABELS[item.recordType]}
          </Badge>
          <span className="min-w-0 truncate text-sm text-copy-primary">
            {item.title}
          </span>
          <span className="ml-auto flex shrink-0 flex-col items-end">
            <span
              className={`text-xs ${
                item.daysUntilDue < 0 ? "text-error" : "text-copy-secondary"
              }`}
            >
              {relativeLabel(item.daysUntilDue)}
            </span>
            <span className="text-xs text-copy-muted">{item.dueDate}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
