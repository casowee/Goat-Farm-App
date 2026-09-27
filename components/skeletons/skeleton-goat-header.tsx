import { SkeletonDots } from "@/components/skeletons/skeleton-region";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Spec 17.3 (§5A / §5D) — the goat detail header card.
 *
 * Mirrors the real header in `app/(app)/goats/[id]/page.tsx`: the 64px avatar
 * tile, the name / tag / stage-badge stack beside it, the action-button cluster
 * on the right, and the six-field detail grid underneath
 * (`sm:grid-cols-2 lg:grid-cols-4`).
 *
 * Only used as a *route*-level fallback. Once the page is rendering, the real
 * header appears immediately from the goat row alone (§5D) and never needs a
 * placeholder — which is exactly what makes the header the first thing on screen.
 */
export function SkeletonGoatHeader({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <SkeletonLine width="w-32" lineHeight="h-7" barHeight="h-5" />
              <SkeletonDots size="sm" />
            </div>
            <SkeletonLine width="w-24" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-md" />
              <SkeletonLine width="w-14" />
            </div>
          </div>
        </div>
        <SkeletonGoatHeaderActions />
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <SkeletonLine width="w-20" lineHeight="h-4" barHeight="h-2.5" />
            <SkeletonLine width="w-28" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Spec 17.3 (§5D) — just the header's action cluster.
 *
 * Split out on purpose. The header's *text* needs only the goat row, but Edit,
 * Add newborn kid, Move barn and Remove each need herd-wide data (every goat for
 * the parent pickers, the barn list, the cause-of-death presets). Rather than
 * hold the whole header back for those, the page streams this cluster on its own
 * and keeps the identity fields instant.
 *
 * Four default-size (`h-8`) buttons wrapping right, the same as the real row.
 */
export function SkeletonGoatHeaderActions({
  label,
  className,
}: {
  /** Visually hidden label (§5F) — pass it when used as a standalone fallback. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      className={cn("skeleton-fade flex flex-col items-end gap-2", className)}
    >
      {label && <span className="sr-only">{label}</span>}
      <div className="flex flex-wrap justify-end gap-2">
        <Skeleton className="h-8 w-16 rounded-xl" />
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}
