import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Spec 17.3 (§5B) — page-shaped fallback for `/calendar`: title, the Month /
 * List tab bar, the four filter chips, the month header and grid, and a couple
 * of day-detail rows. Boxes match the real ones so nothing shifts on arrival.
 *
 * `SkeletonRegion` carries the `LoadingDots` indicator — skeletons supplement
 * the dots, they never replace them.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading the calendar…"
      className="flex flex-col gap-4 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-24" withAction={false} />

      <div className="flex gap-1 border-b border-surface-border">
        <Skeleton className="mb-1 h-6 w-16 rounded-md" />
        <Skeleton className="mb-1 h-6 w-12 rounded-md" />
      </div>

      <div className="flex flex-wrap gap-2">
        {["w-20", "w-24", "w-20", "w-16"].map((width, index) => (
          <Skeleton key={index} className={`h-8 rounded-xl ${width}`} />
        ))}
      </div>

      <Skeleton className="h-8 rounded-xl" />
      <Skeleton className="h-80 rounded-2xl" />

      <SkeletonList rows={2} />
    </SkeletonRegion>
  );
}
