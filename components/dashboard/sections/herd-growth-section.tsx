import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HerdTimelineChart } from "@/components/dashboard/herd-timeline-chart";
import { LogHerdEventDialog } from "@/components/dashboard/log-herd-event-dialog";
import {
  listAllDashboardGoats,
  listHerdEvents,
} from "@/lib/dashboard/queries";
import { computeHerdTimeline } from "@/lib/dashboard/herd-timeline";

// UPD-006 amendment (2026-08-29) — the "Herd growth" section (the cumulative
// running-total chart AND its "Log herd event" trigger) is deactivated at the
// owner's request: the straight-increasing line wasn't useful and the section
// took too much space. This is a deactivation, NOT a deletion — `herd_events`,
// `lib/dashboard/herd-timeline.ts`, `computeHerdTimeline`, the `createHerdEvent`
// server action and `LogHerdEventDialog` are all kept intact. Flip this to
// `true` to bring the whole section back.
//
// Spec 17.3 (§5C) moved the flag and the section's own data here, out of the
// dashboard page. Nothing about the deactivation changed — but the section now
// owns its queries, so re-enabling it is a one-line flip with no page edit, and
// while it is off the dashboard no longer computes a timeline it doesn't render.
// The CSV export's herd size still computes its own timeline in
// `dashboard-top-bar.tsx`, from the same `cache()`d rows.
export const SHOW_HERD_GROWTH_SECTION = false;

export async function HerdGrowthSection() {
  if (!SHOW_HERD_GROWTH_SECTION) return null;

  const [allGoats, herdEvents] = await Promise.all([
    listAllDashboardGoats(),
    listHerdEvents(),
  ]);
  const timeline = computeHerdTimeline(allGoats, herdEvents);
  const pickerGoats = allGoats.map((goat) => ({
    id: goat.id,
    tag: goat.tag,
    name: goat.name,
    status: goat.status,
  }));

  return (
    <Card className="rounded-2xl lg:col-span-2 min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Herd growth</CardTitle>
        <CardDescription>
          Whole-farm herd size over time — births and purchases from goat
          records, plus logged sales, deaths and other changes. Not affected by
          the barn filter.
        </CardDescription>
        <CardAction>
          <LogHerdEventDialog goats={pickerGoats} />
        </CardAction>
      </CardHeader>
      <CardContent className="px-3">
        {timeline.length > 0 ? (
          <HerdTimelineChart data={timeline} />
        ) : (
          <p className="text-sm text-copy-muted">
            No herd history yet. Register goats, or log a herd event, to see the
            timeline.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
