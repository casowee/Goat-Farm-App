import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonPageHeader } from "@/components/skeletons/skeleton-page-header";
import { SkeletonCard } from "@/components/skeletons/skeleton-card";

/**
 * Spec 17.3 (§5B) — Breeding → Settings.
 *
 * Three form cards: the group-ratio / gestation settings, the season templates
 * manager, and the doe-performance thresholds. No action button in the header —
 * this page's saves live inside each form.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading breeding settings…"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      <SkeletonPageHeader titleWidth="w-40" withAction={false} />
      <SkeletonCard contentHeight="h-40" descriptionLines={2} />
      <SkeletonCard contentHeight="h-32" descriptionLines={2} />
      <SkeletonCard contentHeight="h-28" descriptionLines={2} />
    </SkeletonRegion>
  );
}
