"use client";

import { useCallback } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ShowMoreButton, usePaginatedRows } from "@/components/ui/show-more";
import { loadMoreWeights } from "@/app/(app)/weight/actions";
import type { WeightWithDelta } from "@/lib/weight/queries";
import { formatKg } from "@/lib/weight/weights";
import { WeightFormDialog } from "@/components/weight/weight-form-dialog";
import { DeleteWeightDialog } from "@/components/weight/delete-weight-dialog";

/**
 * Weight history, newest-first, 20 at a time (spec 17.2 §5E).
 *
 * Each row arrives with its "change since last weigh-in" already resolved by
 * `listWeightsPageByGoat`, which reads one extra older row per page to work it
 * out. The displayed numbers are therefore identical to the pre-pagination
 * list — only how many rows load at once changed.
 */
export function WeightHistoryList({
  goatId,
  weights,
  total,
}: {
  goatId: number;
  /** The first page, newest first, each row carrying its delta. */
  weights: WeightWithDelta[];
  /** Total weigh-ins this goat has — not just the loaded page. */
  total: number;
}) {
  const loadPage = useCallback(
    (offset: number) => loadMoreWeights(goatId, offset),
    [goatId],
  );

  const { rows, showMore, pending, failed, hasMore, remaining } =
    usePaginatedRows<WeightWithDelta>({
      initialRows: weights,
      total,
      loadPage,
    });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-copy-muted">
        No weigh-ins yet. Use “Add weight” to record one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-1 rounded-xl border border-surface-border bg-subtle px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-copy-primary">
                {formatKg(row.weight_kg)} kg
              </span>
              {row.delta != null && row.delta !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs ${
                    row.delta > 0 ? "text-success" : "text-error"
                  }`}
                >
                  {row.delta > 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {formatKg(Math.abs(row.delta))} kg
                </span>
              )}
              {row.delta === 0 && (
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
