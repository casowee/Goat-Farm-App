import { ArrowDown, ArrowUp } from "lucide-react";
import type { Weight } from "@/app/(app)/weight/actions";
import { formatKg, weightDeltas } from "@/lib/weight/weights";
import { WeightFormDialog } from "@/components/weight/weight-form-dialog";
import { DeleteWeightDialog } from "@/components/weight/delete-weight-dialog";

/**
 * Weight history, newest-first. `weights` comes in oldest-first (as
 * `listWeightsByGoat` returns it) so the change vs. the previous weigh-in can
 * be computed, then the list is reversed for display.
 */
export function WeightHistoryList({
  goatId,
  weights,
}: {
  goatId: number;
  weights: Weight[];
}) {
  if (weights.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        No weigh-ins yet. Use “Add weight” to record one.
      </p>
    );
  }

  const rows = [...weightDeltas(weights)].reverse();

  return (
    <ul className="flex flex-col gap-2">
      {rows.map(({ row, delta }) => (
        <li
          key={row.id}
          className="flex flex-col gap-1 rounded-xl border border-surface-border bg-subtle px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-copy-primary">
              {formatKg(row.weight_kg)} kg
            </span>
            {delta != null && delta !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-xs ${
                  delta > 0 ? "text-success" : "text-error"
                }`}
              >
                {delta > 0 ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {formatKg(Math.abs(delta))} kg
              </span>
            )}
            {delta === 0 && (
              <span className="text-xs text-copy-muted">no change</span>
            )}
            <span className="ml-auto text-xs text-copy-muted">
              {row.weighed_on}
            </span>
          </div>

          {row.notes && (
            <p className="text-xs text-copy-secondary">{row.notes}</p>
          )}

          <div className="flex gap-2 pt-1">
            <WeightFormDialog
              goatId={goatId}
              weight={row}
              triggerLabel="Edit"
              triggerVariant="outline"
              triggerSize="sm"
            />
            <DeleteWeightDialog
              weightId={row.id}
              goatId={goatId}
              label={`${formatKg(row.weight_kg)} kg on ${row.weighed_on}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
