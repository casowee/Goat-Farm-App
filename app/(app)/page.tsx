import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BreedingStatusSkeleton,
  DueSoonSkeleton,
  StockLevelsSkeleton,
  WeightTrendSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { SkeletonChart } from "@/components/skeletons/skeleton-card";
import { DashboardTopBar } from "@/components/dashboard/sections/dashboard-top-bar";
import {
  HerdCompositionSection,
  SexRatioSection,
} from "@/components/dashboard/sections/herd-donut-sections";
import { NewbornKidsSection } from "@/components/dashboard/sections/newborn-kids-section";
import { WeightTrendSection } from "@/components/dashboard/sections/weight-trend-section";
import { BreedingStatusSection } from "@/components/dashboard/sections/breeding-status-section";
import { DueSoonSection } from "@/components/dashboard/sections/due-soon-section";
import { StockLevelsSection } from "@/components/dashboard/sections/stock-levels-section";
import { HerdGrowthSection } from "@/components/dashboard/sections/herd-growth-section";

/**
 * Spec 17.3 (§5C) — the dashboard, split into independently streaming sections.
 *
 * **This component awaits nothing but its own search params, and that is the
 * point.** Each card below is an async server component inside its own
 * `<Suspense>`. Because they are siblings, React renders them all in one pass, so
 * every query still starts at the same moment it did under the old page-level
 * `Promise.all` — no waterfall (§5C, §9, V4). What changed is that a card paints
 * as soon as *its* data is ready instead of waiting for the slowest card on the
 * page. The barn-scoped goat read, the farm-wide goat read, the barn list and the
 * breeding panel are all `cache()`d (`lib/dashboard/queries.ts`,
 * `lib/dashboard/breeding-panel.ts`), so sharing between sections costs nothing.
 *
 * Herd totals still exclude sold, deceased and stolen goats — that logic moved
 * into `loadHerdComposition()` unchanged, and one `cache()`d call now feeds both
 * donuts and the CSV export (§5C, V10).
 *
 * Card order and grid classes are unchanged from before the split, so the page
 * looks identical once everything has arrived.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ barn?: string }>;
}) {
  const { barn } = await searchParams;

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-6">
      <Suspense fallback={null}>
        <DashboardTopBar barn={barn} />
      </Suspense>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {/* Deactivated by UPD-006; the section itself owns the flag and its data. */}
        <Suspense fallback={null}>
          <HerdGrowthSection />
        </Suspense>

        {/*
          UPD-011 refinement (2026-09-05, owner testing): Herd composition
          first, Sex ratio second, Newborn Kids third — Weight growth, Due
          soon and Stock levels keep their prior relative order after that.
        */}
        <Suspense
          fallback={
            <SkeletonChart
              variant="donut"
              withDots
              label="Loading herd composition…"
            />
          }
        >
          <HerdCompositionSection barn={barn} />
        </Suspense>

        <Suspense
          fallback={
            <SkeletonChart
              variant="donut"
              descriptionLines={1}
              label="Loading sex ratio…"
            />
          }
        >
          <SexRatioSection barn={barn} />
        </Suspense>

        <Suspense
          fallback={
            <SkeletonChart
              variant="bar"
              className="lg:col-span-2"
              label="Loading newborn kids…"
            />
          }
        >
          <NewbornKidsSection />
        </Suspense>

        <Suspense fallback={<WeightTrendSkeleton label="Loading weight growth…" />}>
          <WeightTrendSection barn={barn} />
        </Suspense>

        <Suspense
          fallback={<BreedingStatusSkeleton label="Loading breeding season…" />}
        >
          <BreedingStatusSection />
        </Suspense>

        <Suspense fallback={<DueSoonSkeleton label="Loading due soon…" />}>
          <DueSoonSection barn={barn} />
        </Suspense>

        <Suspense fallback={<StockLevelsSkeleton label="Loading stock levels…" />}>
          <StockLevelsSection />
        </Suspense>

        {/* Static — no data, so no boundary. */}
        <Card className="rounded-2xl min-w-0">
          <CardHeader className="px-3">
            <CardTitle>Sales over time</CardTitle>
            <CardDescription>
              Coming soon — available once the Sales &amp; Purchases module is
              built.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3">
            <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-surface-border text-xs text-copy-faint">
              Not yet available
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
