import { SkeletonRegion } from "@/components/skeletons/skeleton-region";
import { SkeletonChart } from "@/components/skeletons/skeleton-card";
import { DashboardSkeletonCards } from "@/components/dashboard/dashboard-skeletons";

/**
 * Spec 17.3 (§5B) — the dashboard's route-level skeleton.
 *
 * Shaped like the real dashboard grid: two donut cards, the full-width Newborn
 * Kids card, then the weight / breeding / due-soon / stock / sales cards in the
 * same order and the same `lg:grid-cols-2` layout, so content drops into place
 * rather than pushing the page around (V3).
 *
 * This sits at the `(app)` segment, one level *below* `(app)/layout.tsx`, so the
 * sidebar and top bar are already mounted and stay usable while it shows (§5B,
 * V2) — a `loading.tsx` at `app/` would have replaced them.
 *
 * Deliberately no page-title placeholder: the dashboard has no `h1` of its own
 * (the title lives in the top bar), so adding one here would shift the whole
 * grid down when the real page arrives. The loading dots ride in the first card
 * instead.
 */
export default function Loading() {
  return (
    <SkeletonRegion
      label="Loading dashboard…"
      className="flex flex-col gap-4 p-4 md:gap-5 md:p-6"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SkeletonChart variant="donut" withDots />
        <SkeletonChart variant="donut" descriptionLines={1} />
        <SkeletonChart variant="bar" className="lg:col-span-2" />
        <DashboardSkeletonCards />
      </div>
    </SkeletonRegion>
  );
}
