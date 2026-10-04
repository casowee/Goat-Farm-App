import Link from "next/link";
import { HEALTH_RECORD_TYPE_LABELS } from "@/lib/health/records";
import { formatIsoDate, type GroupEvent } from "@/lib/health/group-events";

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

/**
 * UPD-019 — how many group health rows the widget shows before handing over to
 * the Health page's Upcoming tab with a "See all" link.
 */
export const DUE_SOON_HEALTH_ROW_LIMIT = 5;

interface Row {
  key: string;
  dueDate: string;
  primary: React.ReactNode;
  secondary: string;
  /** The right-hand side: when it is due, and any mark. */
  trailing: React.ReactNode;
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

/**
 * UPD-019 — a health row is a GROUP event, the same row the Health page's
 * Upcoming tab shows: what it is, which group and how many goats, and when it
 * is next due. No goat is named.
 */
function healthRow(event: GroupEvent): Row {
  const count = event.goats.length;
  const overdue = event.dueStatus === "overdue";

  return {
    key: `h-${event.batchId}`,
    dueDate: event.nextDueDate ?? "",
    primary: (
      <p className="text-sm font-medium text-copy-primary">
        {HEALTH_RECORD_TYPE_LABELS[event.recordType]} · {event.title}
        {event.product && (
          <span className="font-normal text-copy-secondary">
            {" "}
            · {event.product}
          </span>
        )}
      </p>
    ),
    secondary: `${event.label} · ${count} goat${count === 1 ? "" : "s"}`,
    trailing: (
      <span className="flex flex-col items-end gap-0.5">
        {overdue && (
          <span className="rounded-md border border-error px-1.5 py-0.5 text-xs font-medium text-error">
            Overdue
          </span>
        )}
        {event.dueStatus === "due_soon" && (
          <span className="rounded-md border border-warning px-1.5 py-0.5 text-xs font-medium text-warning">
            Due soon
          </span>
        )}
        <span
          className={`text-xs ${overdue ? "text-error" : "text-copy-secondary"}`}
        >
          {formatIsoDate(event.nextDueDate)}
        </span>
      </span>
    ),
  };
}

function breedingRow(item: BreedingDueRow): Row {
  const kind = item.type === "introduce_males" ? "bucks in" : "bucks out";
  return {
    key: `b-${item.key}`,
    dueDate: item.dueDate,
    primary: (
      <span className="text-sm font-medium text-copy-primary">{item.label}</span>
    ),
    secondary: `Breeding · ${kind}${item.isEstimate ? " · estimated" : ""}`,
    trailing: (
      <span
        className={`text-xs ${
          item.daysUntilDue < 0 ? "text-error" : "text-copy-secondary"
        }`}
      >
        {relativeLabel(item.daysUntilDue, item.isEstimate)}
      </span>
    ),
    action: item.action,
  };
}

/**
 * Upcoming group health events plus breeding buck in/out reminders,
 * soonest-first (so anything overdue is at the top). Server-rendered.
 *
 * UPD-019 — the health rows are group events only, already chosen and ordered
 * by `lib/health/group-events.ts`; this component renders the first
 * {@link DUE_SOON_HEALTH_ROW_LIMIT} of them and links to the Health page for
 * the rest. Breeding reminders are never cut: the Health page does not show
 * them, so "See all" could not bring a hidden one back.
 */
export function DueSoonList({
  groupEvents,
  windowDays,
  breedingItems = [],
}: {
  groupEvents: GroupEvent[];
  windowDays: number;
  breedingItems?: BreedingDueRow[];
}) {
  const shownEvents = groupEvents.slice(0, DUE_SOON_HEALTH_ROW_LIMIT);
  const hasMore = groupEvents.length > DUE_SOON_HEALTH_ROW_LIMIT;

  const rows: Row[] = [
    ...shownEvents.map(healthRow),
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
    <div className="flex flex-col gap-3">
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
              {row.trailing}
              {row.action}
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <Link
          href="/health?tab=upcoming"
          className="tappable-inline self-start text-sm text-brand underline underline-offset-2 hover:text-brand/80"
        >
          See all
        </Link>
      )}
    </div>
  );
}
