import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WeightTrendChartLazy } from "@/components/dashboard/weight-trend-chart-lazy";
import { LineChartSkeleton } from "@/components/dashboard/chart-skeleton";
import {
  listDashboardGoats,
  listDashboardWeights,
  resolveBarnView,
} from "@/lib/dashboard/queries";
import { computeMonthlyWeightAverages } from "@/lib/dashboard/weight-trend";

/**
 * Spec 17.3 (§5C) — average recorded weight per month.
 *
 * This is the dashboard's one genuine two-step dependency: the weigh-ins are
 * scoped by the goats in the current barn view, so the goat ids have to come back
 * before the weights query can be built. That was already true before the split —
 * the page ran it as a second `Promise.all` after the first — and isolating it
 * here is an improvement, because now only this card waits the extra hop instead
 * of the whole page.
 *
 * The goat query is the `cache()`d one the donuts also read, so the first hop is
 * usually already resolved by the time this section runs.
 */
export async function WeightTrendSection({
  barn,
}: {
  barn: string | undefined;
}) {
  const { barnId } = await resolveBarnView(barn);
  const goats = await listDashboardGoats(barnId);
  const weightRows = await listDashboardWeights(goats.map((g) => g.id));
  const weightTrend = computeMonthlyWeightAverages(weightRows);

  return (
    <Card className="rounded-2xl min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Weight growth</CardTitle>
        <CardDescription>
          Average recorded weight per month across the herd.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        {weightTrend.length > 0 ? (
          <Suspense fallback={<LineChartSkeleton />}>
            <WeightTrendChartLazy data={weightTrend} />
          </Suspense>
        ) : (
          <p className="text-sm text-copy-muted">
            No weigh-ins recorded yet for this view.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
