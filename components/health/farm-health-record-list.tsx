"use client";

import { useCallback } from "react";
import { CalendarClock, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShowMoreButton, usePaginatedRows } from "@/components/ui/show-more";
import { GoatLink } from "@/components/goats/goat-link";
import { loadMoreFarmHealthRecords } from "@/app/(app)/health/actions";
import type {
  FarmHealthFilters,
  FarmHealthRecord,
} from "@/lib/health/queries";
import {
  HEALTH_RECORD_STATUS_LABELS,
  HEALTH_RECORD_TYPE_LABELS,
  isCourseType,
} from "@/lib/health/records";

// UPD-016 (§5) — the farm-wide History tab: every goat's health records in one
// newest-first list. Feature 07's per-goat list
// (`components/health/health-record-list.tsx`) is untouched and stays the place
// records are added, edited and deleted; this list is deliberately read-only.
// Editing happens where the record lives, on the goat, so there is exactly one
// write path — tapping the goat tag takes you there.
//
// Pagination is the shared 17.2 "Show more" control, and the row body is the
// same shape as the per-goat row so the two views read alike.

function courseSummary(record: FarmHealthRecord): string | null {
  // Deworming and dip wash carry just a product name, no course schedule
  // (UPD-005 amendment; UPD-016 for dip wash).
  if (record.record_type === "deworming" || record.record_type === "dip_wash") {
    return record.medication_name ?? null;
  }
  if (!isCourseType(record.record_type)) return null;
  const parts: string[] = [];
  if (record.medication_name) parts.push(record.medication_name);
  if (record.dosage) parts.push(record.dosage);
  if (record.treatment_duration_days) {
    const perDay = record.treatment_times_per_day
      ? ` × ${record.treatment_times_per_day}/day`
      : "";
    parts.push(`${record.treatment_duration_days} day course${perDay}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function FarmHealthRecordList({
  records,
  total,
  filters,
  filtered,
}: {
  /** The first page, newest first. */
  records: FarmHealthRecord[];
  /** Total records matching the current filters — not just the loaded page. */
  total: number;
  /** Carried into the "Show more" action so page 2 matches page 1. */
  filters: FarmHealthFilters;
  /** Whether a filter is applied — changes the empty-state wording. */
  filtered: boolean;
}) {
  const loadPage = useCallback(
    (offset: number) => loadMoreFarmHealthRecords(filters, offset),
    [filters],
  );

  const { rows, showMore, pending, failed, hasMore, remaining } =
    usePaginatedRows<FarmHealthRecord>({
      initialRows: records,
      total,
      loadPage,
    });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        {filtered
          ? "No health records match these filters. Try widening them."
          : "No health records yet. Open a goat and use “Add health record” on its Health tab to log a vaccination, deworming, dip wash, treatment or checkup."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {rows.map((record) => {
          const summary = courseSummary(record);
          return (
            <li
              key={record.id}
              className="flex flex-col gap-2 rounded-xl border border-surface-border bg-subtle px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <GoatLink goat={record.goats} className="text-sm font-medium" />
                <Badge variant="outline">
                  {HEALTH_RECORD_TYPE_LABELS[record.record_type]}
                </Badge>
                <span className="text-sm font-medium text-copy-primary">
                  {record.title}
                </span>
                {record.status === "active" && (
                  <Badge>{HEALTH_RECORD_STATUS_LABELS.active}</Badge>
                )}
                {record.status === "cancelled" && (
                  <Badge variant="outline">
                    {HEALTH_RECORD_STATUS_LABELS.cancelled}
                  </Badge>
                )}
                <span className="ml-auto text-xs text-copy-muted">
                  {record.date_occurred}
                </span>
              </div>

              {record.goats.name && (
                <p className="text-xs text-copy-muted">{record.goats.name}</p>
              )}

              {summary && (
                <p className="flex items-center gap-1.5 text-xs text-copy-secondary">
                  <Pill className="h-4 w-4 text-copy-muted" />
                  {summary}
                </p>
              )}

              {record.next_due_date && (
                <p className="flex items-center gap-1.5 text-xs text-copy-secondary">
                  <CalendarClock className="h-4 w-4 text-copy-muted" />
                  Next due {record.next_due_date}
                </p>
              )}

              {record.vet_name && (
                <p className="text-xs text-copy-muted">Vet: {record.vet_name}</p>
              )}

              {record.notes && (
                <p className="text-xs text-copy-secondary">{record.notes}</p>
              )}

              {record.cost != null && (
                <span className="text-xs text-copy-muted">
                  Cost: {record.cost}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <ShowMoreButton
          onClick={showMore}
          pending={pending}
          remaining={remaining}
          failed={failed}
        />
      )}
    </div>
  );
}
