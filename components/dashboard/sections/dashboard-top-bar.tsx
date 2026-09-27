import { Suspense } from "react";
import { TopBarSlot } from "@/components/top-bar";
import { BarnFilter } from "@/components/dashboard/barn-filter";
import { DashboardCsvButton } from "@/components/dashboard/dashboard-csv-button";
import {
  listAllDashboardGoats,
  listDashboardBarns,
  listHerdEvents,
  loadHerdComposition,
  resolveBarnView,
} from "@/lib/dashboard/queries";
import { computeHerdTimeline } from "@/lib/dashboard/herd-timeline";

/**
 * Spec 17.3 (§5C) — the dashboard's two top-bar controls.
 *
 * They are split at different depths on purpose. The barn filter needs only the
 * barn list, which is the fastest query on the page, so it is outside the inner
 * boundary and appears almost immediately. The CSV button needs the herd
 * composition *and* the herd timeline (for the current herd size), so it sits
 * behind its own `<Suspense>` and arrives a beat later.
 *
 * Nesting rather than two sibling `TopBarSlot`s matters: both would portal into
 * the same header node, and whichever resolved first would land on the left. One
 * slot with a boundary inside it keeps the filter-then-export order fixed.
 *
 * The fallback is `null`, not a skeleton. A placeholder in the top bar would be
 * two grey pills floating in the chrome of a shell that is otherwise fully
 * interactive — it would read as breakage, not as loading.
 */
export async function DashboardTopBar({ barn }: { barn: string | undefined }) {
  const barns = await listDashboardBarns();

  return (
    <TopBarSlot>
      <BarnFilter barns={barns} value={barn ?? "all"} />
      <Suspense fallback={null}>
        <DashboardCsvSection barn={barn} />
      </Suspense>
    </TopBarSlot>
  );
}

async function DashboardCsvSection({ barn }: { barn: string | undefined }) {
  const { barnId, barnLabel } = await resolveBarnView(barn);

  // Independent: the composition is barn-scoped, the timeline is farm-wide.
  const [composition, allGoats, herdEvents] = await Promise.all([
    loadHerdComposition(barnId),
    listAllDashboardGoats(),
    listHerdEvents(),
  ]);

  // The export reports the current herd size, which is the timeline's last
  // running total — the reason the timeline is still computed even though the
  // "Herd growth" card itself is deactivated (see `herd-growth-section.tsx`).
  const timeline = computeHerdTimeline(allGoats, herdEvents);
  const herdSizeNow =
    timeline.length > 0 ? timeline[timeline.length - 1].runningTotal : 0;

  return (
    <DashboardCsvButton
      composition={composition}
      barnLabel={barnLabel}
      herdSizeNow={herdSizeNow}
    />
  );
}
