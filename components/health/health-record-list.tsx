"use client";

import { useCallback } from "react";
import { CalendarClock, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShowMoreButton, usePaginatedRows } from "@/components/ui/show-more";
import { loadMoreHealthRecords } from "@/app/(app)/health/actions";
import type {
  HealthConditionPreset,
  HealthRecord,
} from "@/app/(app)/health/actions";
import type { InventoryItem } from "@/app/(app)/inventory/actions";
import {
  HEALTH_RECORD_STATUS_LABELS,
  HEALTH_RECORD_TYPE_LABELS,
  isCourseType,
} from "@/lib/health/records";
import { HealthRecordFormDialog } from "@/components/health/health-record-form-dialog";
import { DeleteHealthRecordDialog } from "@/components/health/delete-health-record-dialog";
import { MarkEffectiveToggle } from "@/components/health/mark-effective-toggle";

function courseSummary(record: HealthRecord): string | null {
  // Deworming carries just a product name (UPD-005 amendment), no schedule.
  if (record.record_type === "deworming") {
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

/**
 * Spec 17.2 (§5E) — the Health tab shows the 20 most recent records and loads
 * the next 20 per "Show more" tap. `total` is the real record count from a
 * head-only count query, so a goat with 300 records no longer pulls all 300
 * into the page on every visit.
 *
 * This became a client component for the pagination state; nothing else about
 * how a row renders changed.
 */
export function HealthRecordList({
  goatId,
  records,
  total,
  presets,
  medicines,
}: {
  goatId: number;
  /** The first page, newest first. */
  records: HealthRecord[];
  /** Total records this goat has — not just the loaded page. */
  total: number;
  presets: HealthConditionPreset[];
  medicines: InventoryItem[];
}) {
  const loadPage = useCallback(
    (offset: number) => loadMoreHealthRecords(goatId, offset),
    [goatId],
  );

  const { rows, showMore, pending, failed, hasMore, remaining } =
    usePaginatedRows<HealthRecord>({
      initialRows: records,
      total,
      loadPage,
    });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        No health records yet. Use “Add health record” to log a vaccination,
        treatment, checkup, or other health event.
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

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {record.cost != null && (
                  <span className="text-xs text-copy-muted">
                    Cost: {record.cost}
                  </span>
                )}
                {/*
                  Spec 15 (§6) — the same toggle, the same server action and the
                  same `marked_effective` column the Doctor condition page uses.
                  Marking a treatment effective here and marking it there are
                  one operation on one flag, so the two views cannot disagree.
                */}
                <MarkEffectiveToggle
                  recordId={record.id}
                  effective={record.marked_effective}
                />
                <div className="ml-auto flex gap-2">
                  <HealthRecordFormDialog
                    goatId={goatId}
                    record={record}
                    presets={presets}
                    medicines={medicines}
                    triggerLabel="Edit"
                    triggerVariant="outline"
                    triggerSize="sm"
                  />
                  <DeleteHealthRecordDialog
                    recordId={record.id}
                    goatId={goatId}
                    recordTitle={record.title}
                  />
                </div>
              </div>
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
