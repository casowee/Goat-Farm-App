import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonLine } from "@/components/skeletons/skeleton-line";
import { SkeletonList } from "@/components/skeletons/skeleton-list";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Spec 17.3 (§5B) — the Health Reference browse page, shaped like what it is
 * going to: a title, the disclaimer banner, then a couple of grouped lists.
 *
 * The banner placeholder is `h-16 rounded-2xl` to match the real
 * `DisclaimerBanner`'s two lines of `text-xs` plus `py-3`, so the groups below
 * do not jump when the real one arrives.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading the health reference…"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      <div className="flex flex-col gap-2">
        <SkeletonPageHeader titleWidth="w-40" withAction={false} />
        <SkeletonLine width="w-72" lineHeight="h-5" barHeight="h-3" />
      </div>

      <Skeleton className="h-16 w-full rounded-2xl" />

      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-3">
          <SkeletonLine width="w-32" lineHeight="h-6" barHeight="h-4" />
          <SkeletonList
            rows={group === 0 ? 5 : 3}
            withBadge={false}
            secondaryLines={2}
            className="flex flex-col gap-2"
          />
        </div>
      ))}
    </SkeletonRegion>
  );
}
