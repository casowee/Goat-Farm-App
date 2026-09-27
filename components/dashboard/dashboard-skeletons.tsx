import { SkeletonCard, SkeletonChart } from "@/components/skeletons/skeleton-card";
import { SkeletonList } from "@/components/skeletons/skeleton-list";

/**
 * Spec 17.3 (§5B / §5C) — the dashboard's card-shaped placeholders.
 *
 * Kept next to the dashboard's own components rather than in
 * `components/skeletons/` because these are compositions of the shared blocks
 * for *this page's* cards, not new building blocks. Both the route-level
 * `loading.tsx` and the in-page `<Suspense>` fallbacks use them, so a card's
 * skeleton is defined once and cannot drift between the two.
 */

/**
 * Each takes an optional `label`: the page passes one so the streaming card
 * announces itself (§5F), while the route-level `loading.tsx` leaves it out
 * because its `SkeletonRegion` already labels the whole dashboard once.
 */
interface DashboardSkeletonProps {
  label?: string;
}

/** The weight-growth chart card (§5C section 4). */
export function WeightTrendSkeleton({ label }: DashboardSkeletonProps) {
  return <SkeletonChart variant="bar" descriptionLines={1} label={label} />;
}

/** The compact breeding-status line. */
export function BreedingStatusSkeleton({ label }: DashboardSkeletonProps) {
  return <SkeletonCard padding="px-3" contentHeight="h-16" label={label} />;
}

/** "Due soon" — a short list of reminders. */
export function DueSoonSkeleton({ label }: DashboardSkeletonProps) {
  return (
    <SkeletonCard padding="px-3" descriptionLines={2} label={label}>
      <SkeletonList rows={3} withBadge={false} secondaryLines={0} />
    </SkeletonCard>
  );
}

/** Low / out-of-stock inventory items. */
export function StockLevelsSkeleton({ label }: DashboardSkeletonProps) {
  return (
    <SkeletonCard padding="px-3" descriptionLines={2} label={label}>
      <SkeletonList rows={3} withBadge secondaryLines={0} />
    </SkeletonCard>
  );
}

/**
 * The lower half of the dashboard grid, in render order. Used by the route-level
 * skeleton; in the page itself each of these wraps its own `<Suspense>` so the
 * cards fill in independently.
 */
export function DashboardSkeletonCards() {
  return (
    <>
      <WeightTrendSkeleton />
      <BreedingStatusSkeleton />
      <DueSoonSkeleton />
      <StockLevelsSkeleton />
      <SkeletonCard padding="px-3" descriptionLines={2} contentHeight="h-24" />
    </>
  );
}
