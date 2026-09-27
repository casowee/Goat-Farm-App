import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonCard } from "@/components/skeletons/skeleton-card";
import { BreedingTabs } from "@/components/breeding/breeding-tabs";

/**
 * Spec 17.3 (§5B) — the Breeding "Seasons" tab.
 *
 * Unlike its two sibling tabs this page is a grid of cards (buck capacity, the
 * season summary, the timeline) rather than a list, so it gets its own shape
 * instead of reusing `SkeletonBreedingPage`.
 *
 * `BreedingTabs` renders for real — it needs no data, and being route-backed it
 * already shows the tapped tab as active while the page loads.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading breeding seasons…"
      className="flex flex-col gap-4 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-24" actionWidth="w-44" />
      <BreedingTabs />
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard contentHeight="h-20" descriptionLines={2} />
        <SkeletonCard contentHeight="h-20" descriptionLines={2} />
        <SkeletonCard
          className="lg:col-span-2"
          contentHeight="h-40"
          descriptionLines={2}
        />
      </div>
    </SkeletonRegion>
  );
}
