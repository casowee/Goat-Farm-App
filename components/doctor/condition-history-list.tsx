import { CalendarClock, Pill, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GoatLink } from "@/components/goats/goat-link";
import { MarkEffectiveToggle } from "@/components/health/mark-effective-toggle";
import {
  HEALTH_RECORD_STATUS_LABELS,
  HEALTH_RECORD_TYPE_LABELS,
} from "@/lib/health/records";
import type { DoctorHistoryRecord } from "@/lib/health/queries";

/**
 * Feature 15, Task 3 — "Your farm's history with this condition".
 *
 * Every health record logged under one condition name, across all goats, newest
 * first. A server component: the only interactive part is the effectiveness
 * toggle, which is its own client component (`MarkEffectiveToggle`) shared with
 * the goat's own Health tab, so there is one control and one write path for the
 * flag rather than a second copy here.
 *
 * Goat references go through the shared `GoatLink` (spec 15 §5: "reuse the
 * existing goat-link component") so a goat reads and behaves the same here as
 * it does throughout the Breeding area.
 */

function treatmentSummary(record: DoctorHistoryRecord): string | null {
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

export function ConditionHistoryList({
  records,
}: {
  records: DoctorHistoryRecord[];
}) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        Nothing recorded under this name yet. Once you log a health record with
        this title on a goat, it will appear here — and any treatment you mark as
        effective will be waiting the next time it comes up.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {records.map((record) => {
        const summary = treatmentSummary(record);

        return (
          <li
            key={record.id}
            className="flex flex-col gap-2 rounded-xl border border-surface-border bg-subtle px-3 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {HEALTH_RECORD_TYPE_LABELS[record.record_type]}
              </Badge>
              <span className="text-sm text-copy-secondary">
                <GoatLink goat={record.goats} />
                {record.goats.name && (
                  <span className="text-copy-muted"> · {record.goats.name}</span>
                )}
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
                <Pill className="h-4 w-4 shrink-0 text-copy-muted" aria-hidden />
                {summary}
              </p>
            )}

            {record.treatment_start_date && (
              <p className="flex items-center gap-1.5 text-xs text-copy-secondary">
                <CalendarClock
                  className="h-4 w-4 shrink-0 text-copy-muted"
                  aria-hidden
                />
                Course started {record.treatment_start_date}
              </p>
            )}

            {record.vet_name && (
              <p className="flex items-center gap-1.5 text-xs text-copy-muted">
                <Stethoscope className="h-4 w-4 shrink-0" aria-hidden />
                {record.vet_name}
              </p>
            )}

            {record.notes && (
              <p className="text-xs leading-relaxed text-copy-secondary">
                {record.notes}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {record.cost != null && (
                <span className="text-xs text-copy-muted">
                  Cost: {record.cost}
                </span>
              )}
              <MarkEffectiveToggle
                recordId={record.id}
                effective={record.marked_effective}
                className="ml-auto"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
