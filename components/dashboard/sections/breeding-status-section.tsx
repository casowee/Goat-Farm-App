import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BreedingStatus } from "@/components/dashboard/breeding-status";
import { loadBreedingPanel } from "@/lib/dashboard/breeding-panel";
import { computeCurrentSeasonStatus } from "@/lib/breeding/status";

/**
 * Spec 17.3 (§5C) — the compact "is a buck with the herd right now" line
 * (feature 09). Farm-wide, never barn-filtered.
 *
 * Shares `loadBreedingPanel()` with the "Due soon" card, so the two breeding
 * cards cost one set of queries between them even though they paint separately.
 */
export async function BreedingStatusSection() {
  const { templates, occurrenceRows } = await loadBreedingPanel();
  const now = new Date();
  const status = computeCurrentSeasonStatus(templates, occurrenceRows, now);

  return (
    <Card className="rounded-2xl min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Breeding season</CardTitle>
        <CardDescription>
          Whether a buck is currently with the herd.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        <BreedingStatus status={status} now={now} />
      </CardContent>
    </Card>
  );
}
