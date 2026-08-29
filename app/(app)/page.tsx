import { createClient } from "@/lib/supabase/server";
import { TopBarSlot } from "@/components/top-bar";
import { BarnFilter } from "@/components/dashboard/barn-filter";
import { DashboardCsvButton } from "@/components/dashboard/dashboard-csv-button";
import { SummaryStats } from "@/components/dashboard/summary-stats";
import { CompositionDonut } from "@/components/dashboard/composition-donut";
import { WeightTrendChart } from "@/components/dashboard/weight-trend-chart";
import { DueSoonList } from "@/components/dashboard/due-soon-list";
import { StockLevelsWidget } from "@/components/dashboard/stock-levels-widget";
import { HerdTimelineChart } from "@/components/dashboard/herd-timeline-chart";
import { NewbornPeriodsChart } from "@/components/dashboard/newborn-periods-chart";
import { LogHerdEventDialog } from "@/components/dashboard/log-herd-event-dialog";
import { computeHerdComposition } from "@/lib/dashboard/herd-composition";
import { computeHerdTimeline } from "@/lib/dashboard/herd-timeline";
import { computeMonthlyWeightAverages } from "@/lib/dashboard/weight-trend";
import {
  DEFAULT_DUE_SOON_WINDOW_DAYS,
  dueSoon,
  type DueSoonSourceRecord,
} from "@/lib/dashboard/due-soon";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// UPD-006 amendment (2026-08-29) — the "Herd growth" section (the cumulative
// running-total chart AND its "Log herd event" trigger) is deactivated at the
// owner's request: the straight-increasing line wasn't useful and the section
// took too much space. This is a deactivation, NOT a deletion — `herd_events`,
// `lib/dashboard/herd-timeline.ts`, `computeHerdTimeline`, the `createHerdEvent`
// server action and `LogHerdEventDialog` are all kept intact. Flip this to
// `true` to bring the whole section back. The timeline is still computed below
// because the CSV export reports the current herd size.
const SHOW_HERD_GROWTH_SECTION = false;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ barn?: string }>;
}) {
  const { barn } = await searchParams;
  const supabase = await createClient();

  // RLS scopes every query below to the signed-in owner.
  const { data: barns } = await supabase
    .from("barns")
    .select("id, name")
    .order("name");

  const barnId = barn ? Number(barn) : undefined;
  const hasBarnFilter = barnId !== undefined && Number.isInteger(barnId);
  const barnLabel = hasBarnFilter
    ? ((barns ?? []).find((b) => b.id === barnId)?.name ?? "Selected barn")
    : "All barns";

  // Goats — barn-filtered. Feeds herd composition + the goat lookup the
  // weight and due-soon queries scope through.
  let goatQuery = supabase
    .from("goats")
    .select("id, tag, name, sex, reproductive_state, date_of_birth, status");
  if (hasBarnFilter) {
    goatQuery = goatQuery.eq("barn_id", barnId);
  }
  const { data: goats } = await goatQuery;

  const goatRows = goats ?? [];
  const goatIds = goatRows.map((goat) => goat.id);
  const goatById = new Map(goatRows.map((goat) => [goat.id, goat]));

  const composition = computeHerdComposition(goatRows);

  // Weights — scoped to the same goat set (so the barn filter carries through
  // via goats.barn_id), grouped by month into a farm-wide average.
  const { data: weightRows } = goatIds.length
    ? await supabase
        .from("weights")
        .select("weighed_on, weight_kg")
        .in("goat_id", goatIds)
    : { data: [] };
  const weightTrend = computeMonthlyWeightAverages(weightRows ?? []);

  // Health follow-ups due soon — same goat scoping. Only records that carry a
  // next-due date are relevant.
  const { data: healthRows } = goatIds.length
    ? await supabase
        .from("health_records")
        .select("goat_id, record_type, title, next_due_date, status")
        .not("next_due_date", "is", null)
        .in("goat_id", goatIds)
    : { data: [] };

  const dueSoonSource: DueSoonSourceRecord[] = (healthRows ?? []).map((row) => {
    const goat = goatById.get(row.goat_id);
    return {
      goatId: row.goat_id,
      goatTag: goat?.tag ?? "",
      goatName: goat?.name ?? null,
      recordType: row.record_type,
      title: row.title,
      nextDueDate: row.next_due_date,
      status: row.status,
    };
  });
  const dueItems = dueSoon(dueSoonSource, {
    windowDays: DEFAULT_DUE_SOON_WINDOW_DAYS,
  });

  // Stock levels — farm-wide, deliberately NOT barn-filtered.
  const { data: inventory } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name");

  // Herd population timeline — farm-wide (a whole-farm metric; the barn filter
  // doesn't apply — a goat moving barns isn't an addition or removal). Every
  // goat, with just the fields the timeline + the log-event picker need.
  const { data: allGoats } = await supabase
    .from("goats")
    .select("id, tag, name, status, origin, date_of_birth, purchase_date")
    .order("tag");
  const { data: herdEvents } = await supabase
    .from("herd_events")
    .select("event_type, event_date");

  const timeline = computeHerdTimeline(allGoats ?? [], herdEvents ?? []);
  const herdSizeNow =
    timeline.length > 0 ? timeline[timeline.length - 1].runningTotal : 0;
  const pickerGoats = (allGoats ?? []).map((goat) => ({
    id: goat.id,
    tag: goat.tag,
    name: goat.name,
    status: goat.status,
  }));
  // UPD-007 — the newborn-periods chart buckets born-here goats by birth month;
  // it switches its own window client-side, so it just needs the raw rows.
  const newbornGoats = (allGoats ?? []).map((goat) => ({
    origin: goat.origin,
    date_of_birth: goat.date_of_birth,
  }));

  const stageDonut = [
    { name: "Does", value: composition.byStage.Doe },
    { name: "Bucks", value: composition.byStage.Buck },
    { name: "Doelings", value: composition.byStage.Doeling },
    { name: "Bucklings", value: composition.byStage.Buckling },
    { name: "Wethers", value: composition.byStage.Wether },
    { name: "Kids", value: composition.byStage.Kid },
  ];
  const sexDonut = [
    { name: "Female", value: composition.totalFemale },
    { name: "Male", value: composition.totalMale },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-6">
      <TopBarSlot>
        <BarnFilter barns={barns ?? []} value={barn ?? "all"} />
        <DashboardCsvButton
          composition={composition}
          barnLabel={barnLabel}
          herdSizeNow={herdSizeNow}
        />
      </TopBarSlot>

      <SummaryStats composition={composition} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/*
          UPD-006 amendment (2026-08-29): the entire "Herd growth" section —
          the cumulative timeline chart and the "Log herd event" trigger — is
          deactivated at the owner's request. Kept in code (not deleted) so it
          can be re-enabled by flipping SHOW_HERD_GROWTH_SECTION above.
        */}
        {SHOW_HERD_GROWTH_SECTION && (
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle>Herd growth</CardTitle>
              <CardDescription>
                Whole-farm herd size over time — births and purchases from goat
                records, plus logged sales, deaths and other changes. Not
                affected by the barn filter.
              </CardDescription>
              <CardAction>
                <LogHerdEventDialog goats={pickerGoats} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <HerdTimelineChart data={timeline} />
              ) : (
                <p className="text-sm text-copy-muted">
                  No herd history yet. Register goats, or log a herd event, to
                  see the timeline.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Newborn Kids</CardTitle>
            <CardDescription>
              Kids born on the farm each month. Zero-birth months show as an
              empty bar, not a gap.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <NewbornPeriodsChart goats={newbornGoats} />
            <p className="text-xs text-copy-muted">
              Shows when kids have been born — useful for spotting your farm&apos;s
              natural breeding season until real breeding records exist.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Herd composition</CardTitle>
            <CardDescription>
              {hasBarnFilter
                ? `Goats in ${barnLabel}, by stage.`
                : "All goats, by stage."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompositionDonut data={stageDonut} centerLabel="goats" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Sex ratio</CardTitle>
            <CardDescription>Female to male across this view.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompositionDonut data={sexDonut} centerLabel="goats" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Weight growth</CardTitle>
            <CardDescription>
              Average recorded weight per month across the herd.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weightTrend.length > 0 ? (
              <WeightTrendChart data={weightTrend} />
            ) : (
              <p className="text-sm text-copy-muted">
                No weigh-ins recorded yet for this view.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Due soon</CardTitle>
            <CardDescription>
              Vaccinations, deworming and checkups due in the next{" "}
              {DEFAULT_DUE_SOON_WINDOW_DAYS} days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DueSoonList
              items={dueItems}
              windowDays={DEFAULT_DUE_SOON_WINDOW_DAYS}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Stock levels</CardTitle>
            <CardDescription>
              Low or out-of-stock inventory items (farm-wide — not affected by
              the barn filter).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StockLevelsWidget items={inventory ?? []} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Sales over time</CardTitle>
            <CardDescription>
              Coming soon — available once the Sales &amp; Purchases module is
              built.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-surface-border text-xs text-copy-faint">
              Not yet available
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
