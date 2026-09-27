import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonGoatHeader } from "@/components/skeletons/skeleton-goat-header";
import { SkeletonTabs } from "@/components/skeletons/skeleton-tabs";
import { SkeletonCard } from "@/components/skeletons/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Spec 17.3 (§5B / §5D) — the goat profile.
 *
 * This is the *route* boundary: it covers the wait for the goat row itself, the
 * one piece of data the page can't render anything without. Once that row lands,
 * the page's own `<Suspense>` boundaries take over — the real header appears
 * immediately and only the tabs and the action buttons keep streaming (§5D), so
 * this full-page skeleton is on screen for the shortest possible time.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading goat profile…"
      className="flex flex-col gap-4 p-4 md:p-6"
    >
      {/* The "Back to Goats" ghost button. */}
      <Skeleton className="h-7 w-32 rounded-xl" />

      <SkeletonGoatHeader />

      {/* Barn move history. */}
      <SkeletonCard contentHeight="h-16" descriptionLines={0} />

      <SkeletonTabs tabs={4} rows={4} />
    </SkeletonRegion>
  );
}
