import { Card } from "@/components/ui/card";
import { NewbornPeriodsChart } from "@/components/dashboard/newborn-periods-chart";
import { listAllDashboardGoats } from "@/lib/dashboard/queries";

/**
 * Spec 17.3 (§5C, section 3) — the Newborn Kids card.
 *
 * Farm-wide, so it reads the `cache()`d all-goats query rather than the
 * barn-filtered one. UPD-007 has the chart switch its own window client-side, so
 * it only needs the raw origin/birth-date pairs — unchanged from before the split.
 *
 * UPD-018 adds each goat's status, so the same client component can leave the
 * kids that died out of the bars and count them in the header badge. The badge
 * follows the client-held window, so that component renders the header and
 * content; the static text is passed in from here.
 */
export async function NewbornKidsSection() {
  const allGoats = await listAllDashboardGoats();
  const newbornGoats = allGoats.map((goat) => ({
    status: goat.status,
    origin: goat.origin,
    date_of_birth: goat.date_of_birth,
  }));

  return (
    <Card className="rounded-2xl lg:col-span-2 min-w-0">
      <NewbornPeriodsChart
        goats={newbornGoats}
        title="Newborn Kids"
        description="Kids born on the farm each month (excluding kids that died)."
        caption="Shows when kids have been born — useful for spotting your farm's natural breeding season until real breeding records exist."
      />
    </Card>
  );
}
