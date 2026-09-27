import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewbornPeriodsChart } from "@/components/dashboard/newborn-periods-chart";
import { listAllDashboardGoats } from "@/lib/dashboard/queries";

/**
 * Spec 17.3 (§5C, section 3) — the Newborn Kids card.
 *
 * Farm-wide, so it reads the `cache()`d all-goats query rather than the
 * barn-filtered one. UPD-007 has the chart switch its own window client-side, so
 * it only needs the raw origin/birth-date pairs — unchanged from before the split.
 */
export async function NewbornKidsSection() {
  const allGoats = await listAllDashboardGoats();
  const newbornGoats = allGoats.map((goat) => ({
    origin: goat.origin,
    date_of_birth: goat.date_of_birth,
  }));

  return (
    <Card className="rounded-2xl lg:col-span-2 min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Newborn Kids</CardTitle>
        <CardDescription>
          Kids born on the farm each month. Zero-birth months show as an empty
          bar, not a gap.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-3">
        <NewbornPeriodsChart goats={newbornGoats} />
        <p className="text-xs text-copy-muted">
          Shows when kids have been born — useful for spotting your farm&apos;s
          natural breeding season until real breeding records exist.
        </p>
      </CardContent>
    </Card>
  );
}
