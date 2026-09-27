import { SkeletonDots } from "@/components/skeletons/skeleton-region";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Spec 17.3 (§5A) — the page title row: an `h1` and, on most pages, one action
 * button on the right.
 *
 * Sized against the real thing: the pages all use
 * `text-xl font-semibold` for the title (one `h-7` line) and a default-size
 * `Button` (`h-8`) for the action, inside the standard
 * `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between` row.
 *
 * The loading dots sit next to the title placeholder. That position was chosen
 * because it reads as "this page is loading" without adding any height of its
 * own, so nothing shifts when the real title arrives.
 */
export function SkeletonPageHeader({
  titleWidth = "w-28",
  withAction = true,
  actionWidth = "w-28",
  className,
}: {
  titleWidth?: string;
  withAction?: boolean;
  actionWidth?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <SkeletonLine width={titleWidth} lineHeight="h-7" barHeight="h-5" />
        <SkeletonDots size="sm" />
      </div>
      {withAction && (
        <Skeleton className={cn("h-8 rounded-xl", actionWidth)} />
      )}
    </div>
  );
}
