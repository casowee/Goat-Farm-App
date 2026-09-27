import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonCard } from "@/components/skeletons/skeleton-card";

/**
 * Spec 17.3 (§5B) — barns.
 *
 * `app/(app)/barns/page.tsx` renders a `sm:grid-cols-2 lg:grid-cols-3` grid of
 * barn cards, each a name, an optional category line and a notes line with two
 * small action buttons. Three placeholder cards is a deliberate middle ground:
 * enough to read as a grid, few enough that a farm with two barns doesn't see
 * the page shrink.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading barns…"
      className="flex flex-col gap-4 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-20" actionWidth="w-24" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard contentHeight="h-12" />
        <SkeletonCard contentHeight="h-12" />
        <SkeletonCard contentHeight="h-12" />
      </div>
    </SkeletonRegion>
  );
}
