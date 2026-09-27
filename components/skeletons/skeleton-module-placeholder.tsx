import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonCard } from "@/components/skeletons/skeleton-card";

/**
 * Spec 17.3 (§5B) — the generic stub-route skeleton.
 *
 * The Health, Weight and Sales routes still render `ModulePlaceholder` (a title
 * and one "Coming soon" card) and fetch nothing, so in practice this will almost
 * never be seen. It exists so that every authenticated route has a boundary of
 * its own — otherwise these three would fall back to the dashboard's skeleton
 * from `(app)/loading.tsx`, and the owner would briefly see a grid of chart cards
 * on the way to a stub page.
 *
 * Shaped like `ModulePlaceholder`, not like a list, for the same reason: it
 * should look like where it is going.
 */
export function SkeletonModulePlaceholder({
  titleWidth = "w-40",
}: {
  titleWidth?: string;
}) {
  return (
    <SkeletonRegion label="Loading…" className="flex flex-col gap-4 p-4 md:p-6">
      <SkeletonPageHeader titleWidth={titleWidth} withAction={false} />
      <SkeletonCard contentHeight="h-10" descriptionLines={1} />
    </SkeletonRegion>
  );
}
