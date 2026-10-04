import { Badge } from "@/components/ui/badge";
import { GoatLink } from "@/components/goats/goat-link";
import { HEALTH_RECORD_TYPE_LABELS } from "@/lib/health/records";
import {
  formatIsoDate,
  type GroupEvent,
  type GroupEventGoat,
} from "@/lib/health/group-events";

// UPD-016 amendment (2026-10-04) — the one row design both Health page tabs
// use. Every row says BOTH what was done and what is next:
//
//   Line 1  record type · title, and the product if one was recorded
//   Line 2  Done 2 Sep 2026 · Next due 8 Oct 2026, and the group with its count
//
//   Line 3  only when goats were left out of the action: "Excluded: 021"
//
// The rows arrive already built and ordered by `lib/health/group-events.ts`;
// this component only renders. The goats IN a group are never listed — a row
// names only the goats the owner excluded from it, since those are the
// exceptions worth knowing about.

export function HealthGroupEventList({
  events,
  excludedByBatch,
  emptyMessage,
}: {
  events: GroupEvent[];
  /** Batch id → the goats excluded from that bulk action. */
  excludedByBatch: Map<number, GroupEventGoat[]>;
  emptyMessage: string;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-copy-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => {
        const count = event.goats.length;
        const overdue = event.dueStatus === "overdue";
        const excluded = excludedByBatch.get(event.batchId) ?? [];

        return (
          <li
            key={event.batchId}
            className={`flex flex-col gap-2 rounded-xl border bg-subtle px-3 py-3 ${
              overdue ? "border-error" : "border-surface-border"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {HEALTH_RECORD_TYPE_LABELS[event.recordType]}
              </Badge>
              <span className="min-w-0 text-sm font-medium text-copy-primary">
                {event.title}
                {event.product && (
                  <span className="font-normal text-copy-secondary">
                    {" "}
                    · {event.product}
                  </span>
                )}
              </span>
              {overdue && (
                <span className="ml-auto shrink-0 rounded-md border border-error px-1.5 py-0.5 text-xs font-medium text-error">
                  Overdue
                </span>
              )}
              {event.superseded && (
                <span className="ml-auto shrink-0 rounded-md border border-surface-border px-1.5 py-0.5 text-xs text-copy-muted">
                  Replaced by a newer one
                </span>
              )}
              {event.dueStatus === "due_soon" && (
                <span className="ml-auto shrink-0 rounded-md border border-warning px-1.5 py-0.5 text-xs font-medium text-warning">
                  Due soon
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              <span className="text-copy-primary">
                Done {formatIsoDate(event.dateGiven)} ·{" "}
                <span className={overdue ? "font-medium text-error" : undefined}>
                  {event.nextDueDate
                    ? `Next due ${formatIsoDate(event.nextDueDate)}`
                    : "Next due: not set"}
                </span>
              </span>
              <span className="text-copy-secondary">
                {event.label} · {count} goat{count === 1 ? "" : "s"}
              </span>
            </div>

            {excluded.length > 0 && (
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-copy-muted">
                Excluded:
                {excluded.map((goat) => (
                  <GoatLink key={goat.id} goat={goat} />
                ))}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
