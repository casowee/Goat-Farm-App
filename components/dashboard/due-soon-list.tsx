import Link from "next/link";
import { HEALTH_RECORD_TYPE_LABELS } from "@/lib/health/records";
import type { DueSoonItem } from "@/lib/dashboard/due-soon";

function relativeLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/**
 * Upcoming vaccination / deworming / checkup follow-ups, soonest-first, already
 * windowed and sorted by `dueSoon()`. Server-rendered. Each row links to the
 * goat's profile where the health record lives.
 */
export function DueSoonList({
  items,
  windowDays,
}: {
  items: DueSoonItem[];
  windowDays: number;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        Nothing due in the next {windowDays} days.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((item, index) => (
        <li
          key={`${item.goatId}-${item.recordType}-${item.dueDate}-${index}`}
          className="flex items-center justify-between gap-3 border-t border-surface-border py-2 first:border-t-0 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <Link
              href={`/goats/${item.goatId}`}
              className="text-sm font-medium text-copy-primary hover:text-brand"
            >
              {item.goatName ?? item.goatTag}
            </Link>
            <p className="truncate text-xs text-copy-muted">
              {HEALTH_RECORD_TYPE_LABELS[item.recordType]} · {item.title}
            </p>
          </div>
          <span
            className={`shrink-0 text-xs ${
              item.daysUntilDue < 0 ? "text-error" : "text-copy-secondary"
            }`}
          >
            {relativeLabel(item.daysUntilDue)}
          </span>
        </li>
      ))}
    </ul>
  );
}
