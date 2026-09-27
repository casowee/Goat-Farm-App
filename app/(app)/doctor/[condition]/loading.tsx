import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Spec 17.3 (§5B) — one condition page: the back button, the title, the
 * disclaimer banner, two guidance blocks, then the farm's own history list.
 *
 * Only the history section actually waits on a query; the guidance above it is
 * static content. It is still all one region, because a partial skeleton over a
 * page that renders in one pass would read as a glitch.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading this condition…"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-40 rounded-xl" />
        <SkeletonPageHeader titleWidth="w-56" withAction={false} />
      </div>

      <Skeleton className="h-16 w-full rounded-2xl" />

      {[0, 1].map((block) => (
        <div key={block} className="flex flex-col gap-2">
          <SkeletonLine width="w-44" lineHeight="h-6" barHeight="h-4" />
          {[0, 1, 2, 3].map((line) => (
            <SkeletonLine
              key={line}
              width={line % 2 === 0 ? "w-full" : "w-4/5"}
              lineHeight="h-5"
              barHeight="h-3"
            />
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <SkeletonLine width="w-64" lineHeight="h-6" barHeight="h-4" />
        <SkeletonList rows={3} secondaryLines={2} />
      </div>
    </SkeletonRegion>
  );
}
