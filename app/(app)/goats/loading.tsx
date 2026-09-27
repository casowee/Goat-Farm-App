import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Spec 17.3 (§5B) — the goats list.
 *
 * Shaped like `app/(app)/goats/page.tsx`: the "Goats" title with its "Add Goat"
 * action, then `GoatsList`'s search box and its three filter selects, then the
 * rows. The whole herd is fetched in one query (UPD-008 filters client-side), so
 * this is one wait, not several.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading goats…"
      className="flex flex-col gap-4 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-20" actionWidth="w-24" />

      {/* GoatsList’s filter row: the search input and the Sex / Stage / Barn
          selects. Same heights (`h-8`), radius (`rounded-lg`) and widths as the
          real `Input` / `SelectTrigger`, and the same `lg:` breakpoint — on a
          phone these stack, so the skeleton has to stack too or the list below
          jumps by three rows when the real controls mount. */}
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Skeleton className="h-8 w-full rounded-lg lg:w-64" />
        <Skeleton className="h-8 w-full rounded-lg lg:w-40" />
        <Skeleton className="h-8 w-full rounded-lg lg:w-40" />
        <Skeleton className="h-8 w-full rounded-lg lg:w-40" />
      </div>

      <SkeletonList rows={8} withBadge secondaryLines={1} />
    </SkeletonRegion>
  );
}
