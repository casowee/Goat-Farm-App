import { SkeletonDots } from "@/components/skeletons/skeleton-region";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Spec 17.3 (§5A) — a tab bar plus the panel below it.
 *
 * The bar reproduces the real `TabsList` box (`h-8 rounded-lg bg-muted p-[3px]`,
 * from `components/ui/tabs.tsx`) with one pill per tab, so the bar itself doesn't
 * move when the real triggers mount.
 *
 * Used as the route-level fallback for the whole tab area. Inside the page the
 * real `TabsList` renders straight away — it is static markup with nothing to
 * wait for — and only each panel's body streams, via `SkeletonTabPanel`.
 */
export function SkeletonTabs({
  tabs = 4,
  rows = 4,
  className,
}: {
  tabs?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="inline-flex h-8 w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
        {Array.from({ length: tabs }, (_, index) => (
          <Skeleton key={index} className="h-full w-20 rounded-md" />
        ))}
      </div>
      <SkeletonTabPanel rows={rows} />
    </div>
  );
}

/**
 * Spec 17.3 (§5D) — one tab's panel: the card, its title row and action button,
 * and a short list inside.
 *
 * `rows` is deliberately small (4, not `SkeletonList`'s 8): a tab panel is below
 * the fold on a phone, and a placeholder taller than the real content would
 * shrink the page when the records arrive — the same jump §5A forbids, in the
 * other direction.
 */
export function SkeletonTabPanel({
  rows = 4,
  withAction = true,
  label,
  className,
}: {
  rows?: number;
  withAction?: boolean;
  /** Visually hidden label (§5F) — pass it when used as a standalone fallback. */
  label?: string;
  className?: string;
}) {
  return (
    // Same reasoning as `SkeletonCard`: `aria-busy` and the anti-flash fade go on
    // the card, so no wrapper element gets between the tab panel and its content.
    <Card aria-busy="true" className={cn("skeleton-fade", className)}>
      {label && <span className="sr-only">{label}</span>}
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <SkeletonLine width="w-28" />
          <SkeletonDots size="sm" />
        </div>
        {withAction && <Skeleton className="h-8 w-36 rounded-xl" />}
      </CardHeader>
      <CardContent>
        <SkeletonList rows={rows} />
      </CardContent>
    </Card>
  );
}
