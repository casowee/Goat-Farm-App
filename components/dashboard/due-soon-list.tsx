import Link from "next/link";
import { HEALTH_RECORD_TYPE_LABELS } from "@/lib/health/records";
import type { DueSoonItem } from "@/lib/dashboard/due-soon";

/**
 * Feature 09 (Task 6) — breeding "introduce / remove the buck" reminders are
 * merged into this same list, not shown in a separate card. The dashboard maps
 * `computeBreedingReminders()` output into this shape (ISO date + day count) so
 * the merge and sort stay a plain presentation concern here.
 */
export interface BreedingDueRow {
  key: string;
  type: "introduce_males" | "remove_males";
  label: string;
  /** ISO `YYYY-MM-DD`. */
  dueDate: string;
  /** Whole days from today; negative = overdue. */
  daysUntilDue: number;
  /** No real date logged yet — only a suggestion from settings. */
  isEstimate: boolean;
  /** Optional inline action (e.g. an "Approve season" button). */
  action?: React.ReactNode;
}

interface Row {
  key: string;
  dueDate: string;
  daysUntilDue: number;
  primary: React.ReactNode;
  secondary: string;
  action?: React.ReactNode;
}

function relativeLabel(days: number, isEstimate = false): string {
  const prefix = isEstimate ? "~" : "";
  if (days < 0) {
    const n = Math.abs(days);
    return `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return `${prefix}Due today`;
  if (days === 1) return `${prefix}Due tomorrow`;
  return `${prefix}Due in ${days} days`;
}

function healthRow(item: DueSoonItem, index: number): Row {
  return {
    key: `h-${item.goatId}-${item.recordType}-${item.dueDate}-${index}`,
    dueDate: item.dueDate,
    daysUntilDue: item.daysUntilDue,
    primary: (
      <Link
        href={`/goats/${item.goatId}`}
        className="text-sm font-medium text-copy-primary hover:text-brand"
      >
        {item.goatName ?? item.goatTag}
      </Link>
    ),
    secondary: `${HEALTH_RECORD_TYPE_LABELS[item.recordType]} · ${item.title}`,
  };
}

function breedingRow(item: BreedingDueRow): Row {
  const kind = item.type === "introduce_males" ? "bucks in" : "bucks out";
  return {
    key: `b-${item.key}`,
    dueDate: item.dueDate,
    daysUntilDue: item.daysUntilDue,
    primary: (
      <span className="text-sm font-medium text-copy-primary">{item.label}</span>
    ),
    secondary: `Breeding · ${kind}${item.isEstimate ? " · estimated" : ""}`,
    action: item.action,
  };
}

/**
 * Upcoming vaccination / deworming / checkup follow-ups plus breeding buck
 * in/out reminders, soonest-first. Server-rendered. Health rows link to the
 * goat's profile.
 */
export function DueSoonList({
  items,
  windowDays,
  breedingItems = [],
}: {
  items: DueSoonItem[];
  windowDays: number;
  breedingItems?: BreedingDueRow[];
}) {
  const estimateByKey = new Map(
    breedingItems.map((b) => [`b-${b.key}`, b.isEstimate]),
  );

  const rows: Row[] = [
    ...items.map(healthRow),
    ...breedingItems.map(breedingRow),
  ].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key),
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        Nothing due in the next {windowDays} days.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-3 border-t border-surface-border py-2 first:border-t-0 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            {row.primary}
            <p className="truncate text-xs text-copy-muted">{row.secondary}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`text-xs ${
                row.daysUntilDue < 0 ? "text-error" : "text-copy-secondary"
              }`}
            >
              {relativeLabel(
                row.daysUntilDue,
                estimateByKey.get(row.key) ?? false,
              )}
            </span>
            {row.action}
          </div>
        </li>
      ))}
    </ul>
  );
}
