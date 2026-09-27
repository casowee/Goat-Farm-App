"use client";

import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/loading/loading-dots";
import { SkeletonListRow } from "@/components/skeletons/skeleton-list";
import { HISTORY_PAGE_SIZE, hasMoreRows } from "@/lib/pagination";
import { cn } from "@/lib/utils";

// Spec 17.2 (§5E) — the one "Show more" pattern, built once and reused by every
// long history list, the same way spec 04 established one CRUD template that
// later modules copy.
//
// Two pieces, deliberately separate:
//   - `usePaginatedRows` owns the state (rows so far, pending, whether another
//     page exists) and calls a server action for the next page.
//   - `ShowMoreButton` is the control itself: full-width and `h-11` so it stays
//     thumb-reachable at the bottom of a phone-height list, drawn only from the
//     design tokens in `ui-context.md` (no raw Tailwind colors).
//
// A list keeps rendering its own rows — this file never renders a record, so it
// stays usable by health, weight, or anything added later.
//
// Spec 17.3 (§5E) added the pending skeleton rows. They are rendered *above* the
// button, where the next page of records will actually appear, and the records
// already on screen are untouched — tapping "Show more" extends the list, it never
// replaces it.

/**
 * Loads a server-rendered list one page at a time.
 *
 * `loadPage(offset)` is a server action returning the rows starting at
 * `offset`. `total` is the full count from a head-only count query, so the
 * button can disappear at exactly the right moment instead of after a wasted
 * round-trip that comes back empty.
 */
export function usePaginatedRows<T>({
  initialRows,
  total,
  loadPage,
  pageSize = HISTORY_PAGE_SIZE,
}: {
  initialRows: T[];
  total: number;
  loadPage: (offset: number) => Promise<T[]>;
  pageSize?: number;
}) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  // A page that comes back short means the list ended (a record was deleted
  // between the first render and this click), so stop offering more even if
  // `total` still says otherwise.
  const [ended, setEnded] = useState(false);

  const showMore = useCallback(() => {
    setFailed(false);
    startTransition(async () => {
      try {
        const next = await loadPage(rows.length);
        if (next.length === 0 || next.length < pageSize) setEnded(true);
        if (next.length > 0) setRows((current) => [...current, ...next]);
      } catch {
        setFailed(true);
      }
    });
  }, [loadPage, pageSize, rows.length]);

  return {
    rows,
    showMore,
    pending,
    failed,
    hasMore: !ended && hasMoreRows(rows.length, total),
    remaining: Math.max(0, total - rows.length),
  };
}

export function ShowMoreButton({
  onClick,
  pending,
  remaining,
  failed,
  label = "Show more",
  className,
}: {
  onClick: () => void;
  pending: boolean;
  /** How many records are still unloaded — shown so the tap has a known cost. */
  remaining: number;
  failed?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 pt-1", className)}
      aria-busy={pending || undefined}
    >
      {/*
        Spec 17.3 (§5E) — while the next page loads, three skeleton rows stand in
        for the records about to arrive, in the same `ul`/`li` shape and the same
        `gap-3` the real lists use. Three, not a full page of twenty: the point is
        to show that something is coming in the right place, and twenty grey rows
        would shove the button off a phone screen.

        `skeleton-fade` gives them the same ~150 ms anti-flash delay as a route
        skeleton (§5F), so a fast page of records doesn’t flicker placeholders on
        the way in. The button’s own `LoadingDots` keeps running throughout.
      */}
      {pending && (
        <ul className="skeleton-fade flex flex-col gap-3 pb-1.5">
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={pending}
        className="h-11 w-full rounded-xl"
      >
        {pending ? (
          <LoadingDots size="sm" label="Loading more records…" />
        ) : (
          <>
            {label}
            {remaining > 0 && (
              <span className="text-copy-muted">({remaining} more)</span>
            )}
          </>
        )}
      </Button>
      {failed && (
        <p className="text-center text-xs text-error">
          Could not load more records. Tap to try again.
        </p>
      )}
    </div>
  );
}
