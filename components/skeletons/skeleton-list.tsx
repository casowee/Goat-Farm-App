import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** How many rows a list skeleton shows when the caller doesn't say (§5A). */
export const DEFAULT_SKELETON_ROWS = 8;

/**
 * Spec 17.3 (§5A) — one row of a record list.
 *
 * Matched to the row markup the history lists actually use — `flex flex-col
 * gap-2 rounded-xl border border-surface-border bg-subtle px-3 py-3` in
 * `health-record-list.tsx` and `weight-history-list.tsx` — so a skeleton row and
 * a real row are the same height and the list doesn't reflow when the records
 * arrive (§5A, V3).
 *
 * The badge block is on by default because both of those lists lead with one.
 */
export function SkeletonListRow({
  withBadge = true,
  secondaryLines = 1,
  className,
}: {
  withBadge?: boolean;
  /** Extra detail lines under the title, as the real rows have. */
  secondaryLines?: number;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-surface-border bg-subtle px-3 py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {withBadge && <Skeleton className="h-5 w-16 rounded-md" />}
        <SkeletonLine width="w-32" />
        <SkeletonLine width="w-20" lineHeight="h-4" className="ml-auto" />
      </div>
      {Array.from({ length: secondaryLines }, (_, index) => (
        <SkeletonLine
          key={index}
          width={index % 2 === 0 ? "w-48" : "w-36"}
          lineHeight="h-4"
          barHeight="h-2.5"
        />
      ))}
    </li>
  );
}

/**
 * Spec 17.3 (§5A) — N list rows in the real list's own `ul` wrapper.
 *
 * Widths are varied per row rather than identical, which reads as "content
 * loading" instead of a printed pattern, and costs nothing.
 */
export function SkeletonList({
  rows = DEFAULT_SKELETON_ROWS,
  withBadge = true,
  secondaryLines = 1,
  className,
}: {
  rows?: number;
  withBadge?: boolean;
  secondaryLines?: number;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonListRow
          key={index}
          withBadge={withBadge}
          secondaryLines={index % 3 === 2 ? secondaryLines + 1 : secondaryLines}
        />
      ))}
    </ul>
  );
}
