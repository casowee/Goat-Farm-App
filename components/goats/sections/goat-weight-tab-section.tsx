import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightFormDialog } from "@/components/weight/weight-form-dialog";
import { WeightGrowthChart } from "@/components/weight/weight-growth-chart";
import { WeightHistoryList } from "@/components/weight/weight-history-list";
import {
  countWeightsByGoat,
  listWeightPointsByGoat,
  listWeightsPageByGoat,
} from "@/lib/weight/queries";

/**
 * Spec 17.3 (§5D) — the Weight tab's panel.
 *
 * The growth chart still reads full history and the list still reads one page —
 * 17.2's split, unchanged. Both plus the count fire together.
 */
export async function GoatWeightTabSection({ goatId }: { goatId: number }) {
  const [weights, total, points] = await Promise.all([
    listWeightsPageByGoat(goatId),
    countWeightsByGoat(goatId),
    listWeightPointsByGoat(goatId),
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-sm text-copy-secondary">Weight</CardTitle>
        <WeightFormDialog goatId={goatId} triggerLabel="Add weight" triggerIcon />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {points.length > 0 ? <WeightGrowthChart points={points} /> : null}
        <WeightHistoryList goatId={goatId} weights={weights} total={total} />
      </CardContent>
    </Card>
  );
}
