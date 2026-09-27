import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompositionDonutLazy } from "@/components/dashboard/composition-donut-lazy";
import { DonutChartSkeleton } from "@/components/dashboard/chart-skeleton";
import { loadHerdComposition, resolveBarnView } from "@/lib/dashboard/queries";

// Spec 17.3 (§5C) — the two donut cards, each an independent async section.
//
// Both read `loadHerdComposition()`, which is `cache()`d, so they share one
// query and one computation. That is also why the herd totals cannot drift
// between them or from the CSV export (§5C, V10): there is literally one call.
//
// Each card keeps its own inner `<Suspense fallback={<DonutChartSkeleton />}>`.
// That boundary is not this spec's; it belongs to UPD-011 and covers the
// `next/dynamic` wait for the Recharts *bundle*, which is a separate wait from
// the data wait this spec's outer boundary covers. Both are needed.

export async function HerdCompositionSection({
  barn,
}: {
  barn: string | undefined;
}) {
  const { barnId, barnLabel, hasBarnFilter } = await resolveBarnView(barn);
  const composition = await loadHerdComposition(barnId);

  const stageDonut = [
    { name: "Does", value: composition.byStage.Doe },
    { name: "Bucks", value: composition.byStage.Buck },
    { name: "Doelings", value: composition.byStage.Doeling },
    { name: "Bucklings", value: composition.byStage.Buckling },
    { name: "Wethers", value: composition.byStage.Wether },
    { name: "Kids", value: composition.byStage.Kid },
  ];

  return (
    <Card className="rounded-2xl min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Herd composition</CardTitle>
        <CardDescription>
          {hasBarnFilter
            ? `Active goats in ${barnLabel}, by stage.`
            : "Active goats, by stage."}{" "}
          Sold, deceased and stolen goats are not counted.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        <Suspense fallback={<DonutChartSkeleton />}>
          <CompositionDonutLazy data={stageDonut} centerLabel="goats" />
        </Suspense>
      </CardContent>
    </Card>
  );
}

export async function SexRatioSection({ barn }: { barn: string | undefined }) {
  const { barnId } = await resolveBarnView(barn);
  const composition = await loadHerdComposition(barnId);

  const sexDonut = [
    { name: "Female", value: composition.totalFemale },
    { name: "Male", value: composition.totalMale },
  ];

  return (
    <Card className="rounded-2xl min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Sex ratio</CardTitle>
        <CardDescription>Female to male across this view.</CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        <Suspense fallback={<DonutChartSkeleton />}>
          <CompositionDonutLazy data={sexDonut} centerLabel="goats" />
        </Suspense>
      </CardContent>
    </Card>
  );
}
